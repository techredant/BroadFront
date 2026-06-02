import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RtcSessionProvider,
  useCall,
  useCallStateHooks,
  useStreamVideoClient,
  OwnCapability,
} from "@/rtc";
import { RtcConnectionState } from "@/rtc/types";
import type { EnrichedRtcParticipant } from "@/rtc/types";
import {
  RtcLocalVideoView,
  RtcRemoteVideoView,
} from "@/components/call/RtcVideoViews";
import { configureLivestreamViewerMedia } from "@/utils/callMedia";
import { clerkIdToUid, uidMatchesClerkId } from "@/utils/agoraUid";
import { inviteLiveGuest, denyLiveGuest, leaveLiveViewer } from "@/rtc/agoraApi";
import {
  bindLiveSignaling,
} from "@/rtc/agoraSignaling";
import { clearActiveCommunityLiveSession } from "@/utils/communityLiveSession";
import { clearActiveMarketLiveSession } from "@/utils/marketLiveSession";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Share,
  Dimensions,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaColors } from "@/constants/mediaTheme";
import { useLevel } from "@/context/LevelContext";
import { useFollowContext } from "@/context/FollowContext";
import { useLiveKeyboardInset } from "@/hooks/live/useLiveKeyboardInset";
import {
  LIVE_EVENT,
  LIVE_GIFTS,
  LIVE_JOIN_BATCH_MS,
  LIVE_CHAT_VISIBLE_MAX,
  appendMessage,
  type LiveMessage,
  type SpeakRequest,
  type DonationToast,
} from "@/utils/livestreamSession";
import { LiveChatPanel } from "./LiveChatPanel";
import { LiveGuestStrip } from "./LiveGuestStrip";
import { LiveTopBar } from "./LiveTopBar";
import { LiveActionRail } from "./LiveActionRail";
import { TT } from "@/utils/liveTikTokLayout";
import {
  LiveReactionsOverlay,
  shouldBurstReaction,
  spawnBurstPositions,
} from "./LiveReactionsOverlay";
import { LiveMpesaSheet, type DonationLeaderEntry } from "./LiveMpesaSheet";
import { LiveDonationPopup } from "./LiveDonationPopup";
import { LiveFullScreenGift, type FullScreenGiftPayload } from "./LiveFullScreenGift";
import { LiveHostControlsBar } from "./LiveHostControlsBar";
import { useLiveStreamDuration } from "@/hooks/live/useLiveStreamDuration";
import { useLiveModeration } from "@/hooks/live/useLiveModeration";
import { syncChatMemberProfiles, type ChatMemberProfile } from "@/utils/streamUser";
import {
  completeLiveMpesaPayment,
  type LivePayResult,
} from "@/utils/livePayments";
import { API_PUBLIC_URL, HOSTED_LIVE_POLL_MS, SOCKET_IO_DISABLED_ON_HOST } from "@/constants/api";
import { fetchLiveEvents } from "@/rtc/agoraApi";
import { acquireLiveSocket, releaseLiveSocket } from "@/utils/liveSocket";
import { io } from "socket.io-client";
import {
  productFromLiveCustom,
  type MarketLiveProduct,
} from "@/utils/marketLive";
import { LiveProductsDropdown } from "@/components/live/LiveProductsDropdown";
import NetInfo from "@react-native-community/netinfo";
import {
  resolveLiveHostRole,
  useLivestreamSession,
} from "@/hooks/live/useLivestreamSession";
import { LivestreamAutoJoin } from "@/components/live/LivestreamAutoJoin";
import { StreamConnectionOverlay } from "@/components/call/StreamConnectionOverlay";

const { width: SCREEN_W } = Dimensions.get("window");
const LIVE_SWIPE_THRESHOLD = 90;
type NetworkTier = "good" | "constrained" | "poor";

type Props = {
  goToHomeScreen: () => void;
  onHostEnded?: () => void;
  onSwitchLive?: (callId: string, index: number) => void;
  callId: string;
  isHost?: boolean;
  hostClerkId?: string;
  roomTitle?: string;
  level?: string;
  playlist?: string[];
  initialIndex?: number;
  variant?: "community" | "market";
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
};

export default function LiveScreen({
  goToHomeScreen,
  onHostEnded,
  onSwitchLive,
  callId,
  isHost = false,
  hostClerkId: hostClerkIdProp,
  roomTitle,
  level,
  playlist,
  initialIndex = 0,
  variant = "community",
  productId,
  productTitle,
  productPrice,
  productImage,
}: Props) {
  const client = useStreamVideoClient();
  const { userDetails } = useLevel();
  const insets = useSafeAreaInsets();
  const goHomeRef = useRef(goToHomeScreen);
  goHomeRef.current = goToHomeScreen;

  const initialMarketProduct = useMemo<MarketLiveProduct | null>(() => {
    if (variant !== "market" || !productId) return null;
    return {
      productId,
      title: productTitle || "Product",
      price: Number(productPrice) || 0,
      image: productImage,
    };
  }, [variant, productId, productTitle, productPrice, productImage]);

  const { call, joinError } = useLivestreamSession({
    client,
    callId,
    isHost,
    variant,
    roomTitle,
    level,
    hostClerkId: isHost ? userDetails?.clerkId : hostClerkIdProp,
    initialMarketProduct,
    onEnded: () => goHomeRef.current(),
    onHostEnded,
  });

  if (joinError) {
    return (
      <View style={styles.joinErrorRoot}>
        <Text style={styles.joinErrorText}>{joinError}</Text>
        <Pressable style={styles.joinErrorBtn} onPress={goToHomeScreen}>
          <Text style={styles.joinErrorBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.joiningRoot}>
        <ActivityIndicator size="large" color="#FE2C55" />
        <Text style={styles.joiningText}>
          {isHost ? "Starting your live…" : "Joining live…"}
        </Text>
      </View>
    );
  }

  return (
    <RtcSessionProvider call={call}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <LivestreamAutoJoin isHost={isHost} />
      <LeaveStateHandler goToHomeScreen={goToHomeScreen} />
      <LivestreamStateGate
        isHost={isHost}
        goToHomeScreen={goToHomeScreen}
        callId={callId}
        playlist={playlist}
        initialIndex={initialIndex}
        onSwitchLive={onSwitchLive}
        variant={variant}
        initialMarketProduct={initialMarketProduct}
        insetsBottom={insets.bottom}
      />
    </RtcSessionProvider>
  );
}

function LivestreamStateGate({
  isHost,
  goToHomeScreen,
  callId,
  playlist,
  initialIndex,
  onSwitchLive,
  variant,
  initialMarketProduct,
  insetsBottom,
}: {
  isHost: boolean;
  goToHomeScreen: () => void;
  callId: string;
  playlist?: string[];
  initialIndex: number;
  onSwitchLive?: (callId: string, index: number) => void;
  variant: "community" | "market";
  initialMarketProduct: MarketLiveProduct | null;
  insetsBottom: number;
}) {
  const { useIsCallLive, useCallEndedAt, useCallCallingState } =
    useCallStateHooks();
  const isLive = useIsCallLive();
  const endedAt = useCallEndedAt();
  const callingState = useCallCallingState();

  if (endedAt != null) {
    return (
      <View style={styles.joinErrorRoot}>
        <Text style={styles.joinErrorText}>The livestream has ended.</Text>
        <Pressable style={styles.joinErrorBtn} onPress={goToHomeScreen}>
          <Text style={styles.joinErrorBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!isHost && !isLive && callingState !== RtcConnectionState.JOINED) {
    return (
      <View style={styles.joiningRoot}>
        <ActivityIndicator size="large" color="#FE2C55" />
        <Text style={styles.joiningText}>Waiting for host to go live…</Text>
      </View>
    );
  }

  if (callingState !== RtcConnectionState.JOINED) {
    return (
      <View style={styles.joiningRoot}>
        <ActivityIndicator size="large" color="#FE2C55" />
        <Text style={styles.joiningText}>
          {isHost ? "Starting your live…" : "Joining live…"}
        </Text>
      </View>
    );
  }

  return (
    <LiveCanvas
      isHost={isHost}
      callId={callId}
      playlist={playlist}
      initialIndex={initialIndex}
      onSwitchLive={onSwitchLive}
      variant={variant}
      initialMarketProduct={initialMarketProduct}
      goToHomeScreen={goToHomeScreen}
      insetsBottom={insetsBottom}
    />
  );
}

/* ---------------- STATE HANDLER ---------------- */

function LeaveStateHandler({ goToHomeScreen }: { goToHomeScreen: () => void }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  useEffect(() => {
    if (callingState === RtcConnectionState.LEFT) goToHomeScreen();
  }, [callingState, goToHomeScreen]);

  return null;
}

/* ---------------- LIVE CANVAS ---------------- */

function LiveCanvas({
  isHost,
  callId,
  playlist,
  initialIndex,
  onSwitchLive,
  variant,
  initialMarketProduct,
  goToHomeScreen,
  insetsBottom,
}: {
  isHost: boolean;
  callId: string;
  playlist?: string[];
  initialIndex: number;
  onSwitchLive?: (callId: string, index: number) => void;
  variant: "community" | "market";
  initialMarketProduct: MarketLiveProduct | null;
  goToHomeScreen: () => void;
  insetsBottom: number;
}) {
  return (
    <LiveCanvasJoined
      isHost={isHost}
      callId={callId}
      playlist={playlist}
      initialIndex={initialIndex}
      onSwitchLive={onSwitchLive}
      variant={variant}
      initialMarketProduct={initialMarketProduct}
      goToHomeScreen={goToHomeScreen}
      insetsBottom={insetsBottom}
    />
  );
}

function LiveCanvasJoined({
  isHost,
  callId,
  playlist,
  initialIndex,
  onSwitchLive,
  variant,
  initialMarketProduct,
  goToHomeScreen,
  insetsBottom,
}: {
  isHost: boolean;
  callId: string;
  playlist?: string[];
  initialIndex: number;
  onSwitchLive?: (callId: string, index: number) => void;
  variant: "community" | "market";
  initialMarketProduct: MarketLiveProduct | null;
  goToHomeScreen: () => void;
  insetsBottom: number;
}) {
  const insets = useSafeAreaInsets();
  const call = useCall();
  const { userDetails } = useLevel();

  const {
    useCallCallingState,
    useLocalParticipant,
    useRawParticipants,
    useParticipantCount,
    useMicrophoneState,
    useCameraState,
    useCallCustomData,
    useHasPermissions,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const custom = useCallCustomData();
  const marketProductFromCall = useMemo(
    () => productFromLiveCustom(custom as Record<string, unknown> | undefined),
    [custom],
  );

  const localParticipant = useLocalParticipant();
  const participants = useRawParticipants();
  const hostUserId = call?.state.createdBy?.id;
  const hostAgoraUid = useMemo(
    () => (hostUserId ? clerkIdToUid(hostUserId) : null),
    [hostUserId],
  );
  const canUpdatePermissions = useHasPermissions(
    OwnCapability.UPDATE_CALL_PERMISSIONS,
  );
  const canMuteUsers = useHasPermissions(OwnCapability.MUTE_USERS);

  const myUserId = localParticipant?.userId ?? userDetails?.clerkId;
  const effectiveIsHost = resolveLiveHostRole(isHost, call, myUserId);
  const canModerate =
    effectiveIsHost || canUpdatePermissions || canMuteUsers;
  const myName =
    localParticipant?.name ||
    userDetails?.nickName ||
    userDetails?.firstName ||
    "You";

  const viewerCount = useParticipantCount();
  const mic = useMicrophoneState();
  const cam = useCameraState();

  const [messages, setMessages] = useState<LiveMessage[]>([
    {
      id: "welcome",
      kind: "system",
      userName: "Live",
      text: "Say hi in the chat!",
      createdAt: Date.now(),
    },
  ]);
  const [speakRequests, setSpeakRequests] = useState<SpeakRequest[]>([]);
  const [acceptedGuestIds, setAcceptedGuestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [stageGuestNames, setStageGuestNames] = useState<Record<string, string>>(
    {},
  );
  const [guestProfiles, setGuestProfiles] = useState<
    Record<string, ChatMemberProfile>
  >({});
  const [pendingGuestInvite, setPendingGuestInvite] = useState<{
    token: string;
    uid?: number;
  } | null>(null);
  const [input, setInput] = useState("");
  const [reactions, setReactions] = useState<
    { id: string; emoji: string; left: number }[]
  >([]);
  const [giftToasts, setGiftToasts] = useState<
    {
      id: string;
      emoji: string;
      label: string;
      senderName: string;
    }[]
  >([]);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [donationPopup, setDonationPopup] = useState<DonationToast | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [heartBurstKey, setHeartBurstKey] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [networkTier, setNetworkTier] = useState<NetworkTier>("good");
  const [mpesaTab, setMpesaTab] = useState<"gift" | "donate">("gift");
  const [fullScreenGift, setFullScreenGift] =
    useState<FullScreenGiftPayload | null>(null);
  const [hostMutedGuestIds, setHostMutedGuestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [topDonors, setTopDonors] = useState<DonationLeaderEntry[]>([]);
  const [hostProfile, setHostProfile] = useState<{
    name?: string;
    image?: string | null;
    verified?: boolean;
  }>({});
  const streamDuration = useLiveStreamDuration(true);
  const { inset: keyboardInset, open: keyboardOpen } = useLiveKeyboardInset();
  const { handleFollow, following } = useFollowContext();
  const chatInputRef = useRef<TextInput>(null);
  const lastTap = useRef(0);
  const reactionTapTimes = useRef<number[]>([]);
  const announcedJoins = useRef(new Set<string>());
  const seenLiveEvents = useRef(new Set<string>());
  const messageQueueRef = useRef<Omit<LiveMessage, "id">[]>([]);
  const messageFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const donationQueueRef = useRef<DonationToast[]>([]);
  const donationShowingRef = useRef(false);
  const broadcastedPaymentsRef = useRef(new Set<string>());
  const liveSocketRef = useRef<ReturnType<typeof acquireLiveSocket>>(null);
  const liveEndedHandledRef = useRef(false);
  const guestEverInChannelRef = useRef<Set<string>>(new Set());

  const {
    muteParticipant,
    unmuteParticipant,
    muteEveryone,
    mutingIds,
  } = useLiveModeration({
    isHost: effectiveIsHost,
    hostUserId,
    myUserId,
  });

  const markGuestOnStage = useCallback((userId: string, userName?: string) => {
    if (!userId) return;
    setAcceptedGuestIds((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    if (userName) {
      setStageGuestNames((prev) =>
        prev[userId] === userName ? prev : { ...prev, [userId]: userName },
      );
    }
  }, []);

  const markGuestOffStage = useCallback((userId: string) => {
    if (!userId) return;
    guestEverInChannelRef.current.delete(userId);
    setAcceptedGuestIds((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setStageGuestNames((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const pushPresenceComment = useCallback(
    (kind: "join" | "leave", userName: string, userId?: string) => {
      setMessages((prev) =>
        appendMessage(prev, {
          kind,
          userName,
          userId,
          text:
            kind === "join"
              ? `${userName} joined`
              : `${userName} left`,
        }),
      );
    },
    [],
  );

  const acceptGuestInvite = useCallback(async () => {
    if (!call || !pendingGuestInvite || !myUserId) return;
    try {
      await call.promoteAsLiveGuest(
        pendingGuestInvite.token,
        pendingGuestInvite.uid,
      );
      markGuestOnStage(myUserId, myName);
      await call.sendCustomEvent({
        type: LIVE_EVENT.GUEST_ON_STAGE,
        senderName: myName,
      });
      setMessages((prev) =>
        appendMessage(prev, {
          kind: "system",
          userName: myName,
          text: "You're on stage",
          userId: myUserId,
        }),
      );
      setPendingGuestInvite(null);
    } catch (e) {
      console.log("guest accept error:", e);
      Alert.alert("Could not join stage", "Please try again.");
    }
  }, [call, pendingGuestInvite, markGuestOnStage, myUserId, myName]);

  const declineGuestInvite = useCallback(async () => {
    if (!call || !pendingGuestInvite) return;
    setPendingGuestInvite(null);
    try {
      await denyLiveGuest({
        callId: call.id,
        guestUserId: myUserId,
        hostClerkId: hostUserId || undefined,
      });
      await call.sendCustomEvent({
        type: LIVE_EVENT.GUEST_OFF_STAGE,
        targetUserId: myUserId,
        senderName: myName,
      });
    } catch {
      /* ignore */
    }
  }, [call, pendingGuestInvite, myUserId, myName, hostUserId]);

  const removeGuestFromStage = useCallback(
    async (userId: string, userName: string) => {
      if (!call || !canModerate || userId === hostUserId) return;
      markGuestOffStage(userId);
      setHostMutedGuestIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      try {
        await call.sendCustomEvent({
          type: LIVE_EVENT.GUEST_OFF_STAGE,
          targetUserId: userId,
          senderName: myName,
        });
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: "You",
            text: `removed ${userName} from stage`,
          }),
        );
      } catch (e) {
        console.log("remove guest error:", e);
      }
    },
    [call, canModerate, hostUserId, myName, markGuestOffStage],
  );

  const exitStage = useCallback(async () => {
    if (!call || !myUserId || effectiveIsHost) return;
    try {
      await call.demoteToLiveViewer();
      markGuestOffStage(myUserId);
      await call.sendCustomEvent({
        type: LIVE_EVENT.GUEST_OFF_STAGE,
        targetUserId: myUserId,
        senderName: myName,
      });
      setMessages((prev) =>
        appendMessage(prev, {
          kind: "system",
          userName: myName,
          text: "left the stage",
          userId: myUserId,
        }),
      );
    } catch (e) {
      console.log("exit stage error:", e);
      Alert.alert("Could not leave stage", "Please try again.");
    }
  }, [call, myUserId, myName, effectiveIsHost, markGuestOffStage]);

  useEffect(() => {
    if (!call || effectiveIsHost || callingState !== RtcConnectionState.JOINED) return;
    configureLivestreamViewerMedia(call);
  }, [call, effectiveIsHost, callingState, networkTier]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const cellularGen = state.details && "cellularGeneration" in state.details
        ? state.details.cellularGeneration
        : null;
      if (!state.isConnected || state.isInternetReachable === false) {
        setNetworkTier("poor");
      } else if (cellularGen === "2g" || cellularGen === "3g") {
        setNetworkTier("constrained");
      } else {
        setNetworkTier("good");
      }
    });
    return unsubscribe;
  }, []);

  const isPublishingVideo = useCallback(
    (p: EnrichedRtcParticipant) => Boolean(p.hasVideo),
    [],
  );

  const isGuestOnStage = useMemo(
    () =>
      Boolean(
        !effectiveIsHost &&
          myUserId &&
          acceptedGuestIds.has(myUserId),
      ),
    [effectiveIsHost, myUserId, acceptedGuestIds],
  );

  const isHostParticipant = useCallback(
    (p: EnrichedRtcParticipant) =>
      Boolean(
        hostUserId &&
          (p.userId === hostUserId ||
            uidMatchesClerkId(p.uid, hostUserId) ||
            (hostAgoraUid != null && p.uid === hostAgoraUid)),
      ),
    [hostUserId, hostAgoraUid],
  );

  const appendLiveMessage = useCallback(
    (msg: Omit<LiveMessage, "id" | "createdAt">) => {
      setMessages((prev) => appendMessage(prev, msg));
    },
    [],
  );

  const enqueueMessage = useCallback(
    (msg: Omit<LiveMessage, "id" | "createdAt">) => {
      if (msg.kind === "chat" || msg.kind === "join" || msg.kind === "leave") {
        appendLiveMessage(msg);
        return;
      }

      messageQueueRef.current.push(msg);
      if (messageFlushTimerRef.current) return;
      messageFlushTimerRef.current = setTimeout(() => {
        messageFlushTimerRef.current = null;
        const queued = messageQueueRef.current.splice(0);
        if (!queued.length) return;
        setMessages((prev) => {
          let next = prev;
          for (const item of queued) {
            next = appendMessage(next, item);
          }
          return next;
        });
      }, LIVE_JOIN_BATCH_MS);
    },
    [appendLiveMessage],
  );

  useEffect(
    () => () => {
      if (messageFlushTimerRef.current) {
        clearTimeout(messageFlushTimerRef.current);
        messageFlushTimerRef.current = null;
      }
    },
    [],
  );

  const primaryParticipant = useMemo(() => {
    if (effectiveIsHost && localParticipant) return localParticipant;

    const hostParticipant = participants.find(
      (p) => !p.isLocalParticipant && isHostParticipant(p),
    );
    if (hostParticipant) return hostParticipant;

    const remotePublishing = participants.find(
      (p) => !p.isLocalParticipant && isPublishingVideo(p),
    );
    if (remotePublishing) return remotePublishing;

    const anyRemote = participants.find((p) => !p.isLocalParticipant);
    if (anyRemote) return anyRemote;

    return undefined;
  }, [
    effectiveIsHost,
    localParticipant,
    participants,
    isHostParticipant,
    isPublishingVideo,
  ]);

  const miniParticipants = useMemo(() => {
    if (!acceptedGuestIds.size) return [];

    const guests: EnrichedRtcParticipant[] = [];

    for (const userId of acceptedGuestIds) {
      if (userId === hostUserId) continue;

      const fromChannel = participants.find(
        (p) =>
          p.userId === userId &&
          !isHostParticipant(p) &&
          p.sessionId !== primaryParticipant?.sessionId,
      );
      if (fromChannel) {
        guests.push({
          ...fromChannel,
          name:
            fromChannel.name ||
            stageGuestNames[userId] ||
            guestProfiles[userId]?.name ||
            "Guest",
          image:
            fromChannel.image ||
            guestProfiles[userId]?.image ||
            (userId === myUserId ? userDetails?.image : undefined) ||
            undefined,
        });
        continue;
      }

      if (
        userId === myUserId &&
        localParticipant &&
        !isHostParticipant(localParticipant) &&
        localParticipant.sessionId !== primaryParticipant?.sessionId
      ) {
        guests.push({
          ...localParticipant,
          name:
            localParticipant.name ||
            stageGuestNames[userId] ||
            guestProfiles[userId]?.name ||
            myName,
          image:
            localParticipant.image ||
            guestProfiles[userId]?.image ||
            userDetails?.image ||
            undefined,
        });
        continue;
      }

      guests.push({
        userId,
        uid: 0,
        name:
          stageGuestNames[userId] ||
          guestProfiles[userId]?.name ||
          "Guest",
        image: guestProfiles[userId]?.image || undefined,
        sessionId: `stage-${userId}`,
        isLocalParticipant: userId === myUserId,
        isSpeaking: false,
        publishedTracks: [],
        hasVideo: false,
        hasAudio: false,
      });
    }

    return guests;
  }, [
    acceptedGuestIds,
    participants,
    isHostParticipant,
    primaryParticipant?.sessionId,
    localParticipant,
    myUserId,
    hostUserId,
    stageGuestNames,
    guestProfiles,
    userDetails?.image,
    myName,
  ]);

  const mutedGuestIds = hostMutedGuestIds;

  const toggleGuestMute = useCallback(
    async (userId: string, userName: string, currentlyMuted: boolean) => {
      if (!call || !canModerate) return;
      try {
        if (currentlyMuted) {
          await unmuteParticipant(userId);
          setHostMutedGuestIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        } else {
          await muteParticipant(userId, userName);
          setHostMutedGuestIds((prev) => new Set(prev).add(userId));
        }
      } catch (e) {
        console.log("toggle guest mute error:", e);
      }
    },
    [call, canModerate, muteParticipant, unmuteParticipant],
  );

  const muteAllGuests = useCallback(() => {
    if (!call || !canModerate) return;
    Alert.alert(
      "Mute all guests",
      "Mute every on-stage guest? You will stay unmuted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mute all",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const guestIds = miniParticipants
                  .filter((p) => !p.isLocalParticipant)
                  .map((p) => p.userId);
                await muteEveryone(guestIds);
                setHostMutedGuestIds(new Set(guestIds));
              } catch (e) {
                console.log("mute all guests error:", e);
              }
            })();
          },
        },
      ],
    );
  }, [call, canModerate, miniParticipants, muteEveryone]);

  const playDonationSound = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const flushDonationQueue = useCallback(() => {
    if (donationShowingRef.current) return;
    const next = donationQueueRef.current.shift();
    if (!next) return;
    donationShowingRef.current = true;
    setDonationPopup(next);
    playDonationSound();
  }, [playDonationSound]);

  const pushDonation = useCallback(
    (userName: string, amount: number, userId?: string) => {
      const toast: DonationToast = {
        id: `${Date.now()}-${Math.random()}`,
        userName,
        amount,
      };
      setTopDonors((prev) => {
        const idx = prev.findIndex((d) => d.userName === userName);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            total: next[idx].total + amount,
          };
          return next.sort((a, b) => b.total - a.total).slice(0, 10);
        }
        return [...prev, { userName, total: amount }]
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
      });
      setMessages((prev) =>
        appendMessage(prev, {
          kind: "donation",
          userName,
          text: `donated KES ${amount.toLocaleString()}`,
          userId,
        }),
      );
      if (!donationShowingRef.current) {
        donationShowingRef.current = true;
        setDonationPopup(toast);
        playDonationSound();
      } else {
        donationQueueRef.current.push(toast);
      }
    },
    [playDonationSound],
  );

  const bumpLikes = useCallback((n = 1) => {
    setLikeCount((c) => c + n);
  }, []);

  const pushReaction = useCallback(
    (emoji: string, left: number, skipLikeBump = false) => {
      if (
        !skipLikeBump &&
        (emoji === "❤️" || emoji === "heart")
      ) {
        bumpLikes(1);
      }
      const id = `${Date.now()}-${Math.random()}`;
      setReactions((prev) => [...prev, { id, emoji, left }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 1500);
    },
    [bumpLikes],
  );

  const emitReaction = useCallback(
    (emoji: string) => {
      const now = Date.now();
      if (emoji === "❤️") setHeartBurstKey((k) => k + 1);
      reactionTapTimes.current = reactionTapTimes.current.filter(
        (t) => now - t < 700,
      );
      reactionTapTimes.current.push(now);
      const burst = shouldBurstReaction(reactionTapTimes.current);
      const burstCount = networkTier === "good" ? 10 : 4;
      const positions = burst
        ? spawnBurstPositions(burstCount, TT.reactionSpawnX)
        : [TT.reactionSpawnX + (Math.random() * 40 - 20)];
      positions.forEach((left) => pushReaction(emoji, left));
      void (async () => {
        if (!call) return;
        const reactionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const sentAt = Date.now();
        try {
          await call.sendCustomEvent({
            type: LIVE_EVENT.REACTION,
            emoji,
            left: positions[0],
            burst,
            burstCount: burst ? positions.length : 1,
            reactionId,
            sentAt,
            senderName: myName,
          });
        } catch (e) {
          console.log("reaction send error:", e);
        }
      })();
    },
    [call, myName, networkTier, pushReaction],
  );

  const pushGiftToast = useCallback(
    (
      emoji: string,
      label: string,
      senderName: string,
      amount?: number,
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      setGiftToasts((prev) => [...prev, { id, emoji, label, senderName }]);
      setFullScreenGift({ id, emoji, label, senderName, amount });
      setTimeout(() => {
        setGiftToasts((prev) => prev.filter((g) => g.id !== id));
      }, 3200);
    },
    [],
  );

  useEffect(() => {
    if (!hostUserId) return;
    void syncChatMemberProfiles([hostUserId])
      .then((profiles) => {
        const profile = profiles.find((p) => p.clerkId === hostUserId);
        if (profile) {
          setHostProfile({
            name: profile.name,
            image: profile.image,
          });
        }
      })
      .catch(() => {});
  }, [hostUserId]);

  useEffect(() => {
    const ids = [
      ...Array.from(acceptedGuestIds),
      ...speakRequests.map((r) => r.userId),
      myUserId,
    ].filter(Boolean) as string[];
    const unique = [...new Set(ids)];
    if (!unique.length) return;

    void syncChatMemberProfiles(unique)
      .then((profiles) => {
        if (!profiles.length) return;
        setGuestProfiles((prev) => {
          const next = { ...prev };
          for (const profile of profiles) {
            next[profile.clerkId] = profile;
          }
          return next;
        });
        setStageGuestNames((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const profile of profiles) {
            if (profile.name?.trim() && next[profile.clerkId] !== profile.name) {
              next[profile.clerkId] = profile.name;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {});
  }, [acceptedGuestIds, speakRequests, myUserId]);

  const stageProfileImages = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    if (myUserId && userDetails?.image) {
      map[myUserId] = userDetails.image;
    }
    for (const [userId, profile] of Object.entries(guestProfiles)) {
      if (profile.image) {
        map[userId] = profile.image;
      }
    }
    return map;
  }, [guestProfiles, myUserId, userDetails?.image]);

  const chatMaxHeight = useMemo(() => {
    const base = keyboardOpen ? TT.chatHeightKeyboard : TT.chatHeight;
    return canModerate ? base - 20 : base;
  }, [canModerate, keyboardOpen]);

  const dockPaddingClosed = Math.max(insetsBottom + 6, 10);
  const controlsBlockHeight = effectiveIsHost ? 58 : 48;
  const dockBottom = keyboardOpen ? keyboardInset : 0;
  const dockPadBottom = keyboardOpen ? 8 : dockPaddingClosed;
  const fadeHeight =
    chatMaxHeight + (keyboardOpen ? 56 : controlsBlockHeight + 72);

  const hostClerkId = hostUserId;
  const showFollowBtn =
    !effectiveIsHost && !!hostClerkId && hostClerkId !== myUserId;
  const isFollowingHost = hostClerkId
    ? following.includes(hostClerkId)
    : false;

  const onFollowHost = useCallback(async () => {
    if (!hostClerkId || followBusy) return;
    setFollowBusy(true);
    try {
      await handleFollow(hostClerkId);
    } catch (e) {
      console.log("follow host error:", e);
    } finally {
      setFollowBusy(false);
    }
  }, [hostClerkId, followBusy, handleFollow]);

  useEffect(() => {
    for (const p of participants) {
      if (acceptedGuestIds.has(p.userId)) {
        guestEverInChannelRef.current.add(p.userId);
      }
    }
  }, [participants, acceptedGuestIds]);

  useEffect(() => {
    if (!call || !acceptedGuestIds.size) return;

    for (const uid of acceptedGuestIds) {
      if (uid === hostUserId) continue;
      const inChannel = participants.some((p) => p.userId === uid);
      if (inChannel) continue;
      if (!guestEverInChannelRef.current.has(uid)) continue;

      markGuestOffStage(uid);
      if (canModerate || uid === myUserId) {
        void call
          .sendCustomEvent({
            type: LIVE_EVENT.GUEST_OFF_STAGE,
            targetUserId: uid,
            senderName: myName,
          })
          .catch(() => {});
      }
    }
  }, [
    acceptedGuestIds,
    participants,
    call,
    canModerate,
    hostUserId,
    myUserId,
    myName,
    markGuestOffStage,
  ]);

  const liveEventCtxRef = useRef({
    myUserId,
    hostUserId,
    canModerate,
    networkTier,
    effectiveIsHost,
    enqueueMessage,
    pushReaction,
    pushGiftToast,
    pushDonation,
    pushPresenceComment,
    markGuestOnStage,
    markGuestOffStage,
    bumpLikes,
  });
  liveEventCtxRef.current = {
    myUserId,
    hostUserId,
    canModerate,
    networkTier,
    effectiveIsHost,
    enqueueMessage,
    pushReaction,
    pushGiftToast,
    pushDonation,
    pushPresenceComment,
    markGuestOnStage,
    markGuestOffStage,
    bumpLikes,
  };
  const callRef = useRef(call);
  callRef.current = call;

  useEffect(() => {
    liveEndedHandledRef.current = false;
  }, [call?.id]);

  const handleRemoteLiveEnded = useCallback(() => {
    if (liveEndedHandledRef.current || !call) return;
    liveEndedHandledRef.current = true;
    void call.markLiveEnded({ skipBackend: true }).catch((e) => {
      console.log("remote live end error:", e);
      liveEndedHandledRef.current = false;
    });
  }, [call]);

  useEffect(() => {
    const call = callRef.current;
    if (!call?.id) return;

    const ctx = () => liveEventCtxRef.current;

    const resolvePayload = (event: {
      custom?: Record<string, unknown>;
    }): Record<string, unknown> | null => {
      const raw = event.custom;
      if (!raw) return null;
      if (typeof raw.type === "string") return raw;
      const nested = raw.custom as Record<string, unknown> | undefined;
      if (nested && typeof nested.type === "string") return nested;
      return null;
    };

    const ingestLiveEvent = (
      payload: Record<string, unknown>,
      meta?: { senderId?: string; senderName?: string; dedupeKey?: string },
    ) => {
      const senderId =
        meta?.senderId ?? (payload.senderId as string | undefined);
      const senderName =
        meta?.senderName ??
        (payload.senderName as string | undefined) ??
        (payload.userName as string | undefined) ??
        "Member";

      if (!payload?.type) return;
      const eventKey =
        meta?.dedupeKey ||
        (typeof payload.eventId === "string" ? payload.eventId : undefined) ||
        (typeof payload.messageId === "string" ? payload.messageId : undefined) ||
        (typeof payload.reactionId === "string" ? payload.reactionId : undefined) ||
        (typeof payload.giftEventId === "string" ? payload.giftEventId : undefined) ||
        (typeof payload.donationEventId === "string"
          ? payload.donationEventId
          : undefined) ||
        `${senderId || "anon"}:${String(payload.type)}:${String(
          payload.text || payload.emoji || payload.giftId || payload.targetUserId || "",
        )}:${String(payload.sentAt || "")}`;
      if (seenLiveEvents.current.has(eventKey)) return;
      seenLiveEvents.current.add(eventKey);
      if (seenLiveEvents.current.size > 500) {
        seenLiveEvents.current = new Set([...seenLiveEvents.current].slice(-250));
      }

      if (payload.type === LIVE_EVENT.CHAT && typeof payload.text === "string") {
        const { myUserId, hostUserId, enqueueMessage } = ctx();
        if (senderId === myUserId) return;
        enqueueMessage({
          kind: "chat",
          userId: senderId,
          userName: senderName,
          text: payload.text as string,
          isHost: senderId === hostUserId,
        });
        return;
      }

      if (
        payload.type === LIVE_EVENT.REACTION &&
        typeof payload.emoji === "string"
      ) {
        const { myUserId, networkTier, bumpLikes, pushReaction } = ctx();
        if (senderId === myUserId) return;
        const burstCount =
          payload.burst && typeof payload.burstCount === "number"
            ? payload.burstCount
            : 1;
        const baseLeft =
          typeof payload.left === "number"
            ? payload.left
            : TT.reactionSpawnX + (Math.random() * 40 - 20);
        const positions = payload.burst
          ? spawnBurstPositions(
              Math.min(burstCount, networkTier === "good" ? 10 : 4),
              baseLeft,
            )
          : [baseLeft];
        if (payload.emoji === "❤️") bumpLikes(burstCount);
        positions.forEach((left) =>
          pushReaction(payload.emoji as string, left, true),
        );
        return;
      }

      if (
        payload.type === LIVE_EVENT.GIFT &&
        typeof payload.giftId === "string"
      ) {
        const { myUserId, pushGiftToast, enqueueMessage } = ctx();
        if (senderId === myUserId) return;
        const gift = LIVE_GIFTS.find((g) => g.id === payload.giftId);
        if (!gift) return;
        const sender = (payload.senderName as string) || senderName;
        pushGiftToast(gift.emoji, gift.label, sender, gift.amount);
        enqueueMessage({
          kind: "gift",
          userName: sender,
          text: `sent ${gift.label}`,
          giftEmoji: gift.emoji,
          userId: senderId,
        });
        return;
      }

      if (
        payload.type === LIVE_EVENT.DONATION &&
        typeof payload.amount === "number"
      ) {
        const { myUserId, pushDonation } = ctx();
        if (senderId === myUserId) return;
        pushDonation(
          (payload.senderName as string) || senderName,
          payload.amount,
          senderId,
        );
        return;
      }

      if (payload.type === LIVE_EVENT.SPEAK_REQUEST && senderId) {
        const { canModerate, enqueueMessage } = ctx();
        if (!canModerate) return;
        setSpeakRequests((prev) => {
          if (prev.some((r) => r.userId === senderId)) return prev;
          return [...prev, { userId: senderId, userName: senderName }];
        });
        enqueueMessage({
          kind: "system",
          userName: senderName,
          text: "requested to speak",
          userId: senderId,
        });
        return;
      }

      if (payload.type === LIVE_EVENT.JOIN) {
        const { myUserId, pushPresenceComment } = ctx();
        const uid = senderId || (payload.userId as string | undefined);
        const name =
          senderName ||
          (payload.userName as string | undefined) ||
          "Member";
        if (!uid || uid === myUserId) return;
        if (announcedJoins.current.has(uid)) return;
        announcedJoins.current.add(uid);
        pushPresenceComment("join", name, uid);
        return;
      }

      if (payload.type === LIVE_EVENT.LEAVE) {
        const { myUserId, pushPresenceComment, markGuestOffStage } = ctx();
        const uid = senderId || (payload.userId as string | undefined);
        const name =
          senderName ||
          (payload.userName as string | undefined) ||
          "Member";
        if (!uid || uid === myUserId) return;
        announcedJoins.current.delete(uid);
        markGuestOffStage(uid);
        pushPresenceComment("leave", name, uid);
        return;
      }

      if (payload.type === LIVE_EVENT.GUEST_ON_STAGE && senderId) {
        ctx().markGuestOnStage(
          senderId,
          senderName || (payload.senderName as string | undefined),
        );
        return;
      }

      if (payload.type === LIVE_EVENT.GUEST_OFF_STAGE) {
        const uid =
          (payload.targetUserId as string | undefined) || senderId;
        if (uid) {
          ctx().markGuestOffStage(uid);
          if (uid === ctx().myUserId) {
            void callRef.current?.demoteToLiveViewer().catch(() => {});
          }
        }
        return;
      }

      if (payload.type === LIVE_EVENT.GUEST_MUTED) {
        const targetUserId = payload.targetUserId as string | undefined;
        if (!targetUserId) return;
        const rtc = callRef.current;
        if (!rtc) return;
        if (targetUserId === ctx().myUserId) {
          void rtc.microphone.disable();
        } else {
          void rtc.muteUser(targetUserId, "audio");
        }
        return;
      }

      if (payload.type === LIVE_EVENT.GUEST_UNMUTED) {
        const targetUserId = payload.targetUserId as string | undefined;
        if (!targetUserId) return;
        const rtc = callRef.current;
        if (!rtc) return;
        if (targetUserId === ctx().myUserId) {
          void rtc.microphone.enable();
        } else {
          void rtc.unmuteUser(targetUserId, "audio");
        }
        return;
      }

      if (
        payload.type === LIVE_EVENT.SPEAK_INVITE &&
        payload.targetUserId === ctx().myUserId
      ) {
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: "Host",
            text: "invited you to speak — tap Accept to join",
          }),
        );
        return;
      }

      if (
        payload.type === LIVE_EVENT.SPEAK_DENIED &&
        payload.targetUserId === ctx().myUserId
      ) {
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: "Host",
            text: "declined your request to speak",
          }),
        );
      }
    };

    const onCustom = (rawEvent: unknown) => {
      const event = rawEvent as {
        custom?: Record<string, unknown>;
        user?: { id?: string; name?: string };
        cid?: string;
        created_at?: string;
        createdAt?: string;
      };
      const payload = resolvePayload(event);
      if (!payload) return;
      ingestLiveEvent(payload, {
        senderId: event.user?.id ?? (payload.senderId as string | undefined),
        senderName:
          event.user?.name ?? (payload.senderName as string | undefined),
        dedupeKey:
          (typeof payload.messageId === "string" ? payload.messageId : undefined) ||
          event.cid ||
          `${event.user?.id || payload.senderId || "anon"}:${String(payload.type)}:${String(
            payload.text || payload.emoji || payload.giftId || payload.targetUserId || "",
          )}:${event.created_at || event.createdAt || String(payload.sentAt || "")}`,
      });
    };

    const unsubCustom = call.on("custom", onCustom);

    const mapSocketLivePayload = (
      socketType: string,
      data: Record<string, unknown>,
    ) => {
      const socketToEvent: Record<string, string> = {
        "live:chat": LIVE_EVENT.CHAT,
        "live:reaction": LIVE_EVENT.REACTION,
        "live:gift": LIVE_EVENT.GIFT,
        "live:donation": LIVE_EVENT.DONATION,
        "live:join_ping": LIVE_EVENT.JOIN,
        "live:leave_ping": LIVE_EVENT.LEAVE,
        "live:speak_request": LIVE_EVENT.SPEAK_REQUEST,
        "live:guest_on_stage": LIVE_EVENT.GUEST_ON_STAGE,
        "live:guest_off_stage": LIVE_EVENT.GUEST_OFF_STAGE,
        "live:guest_muted": LIVE_EVENT.GUEST_MUTED,
        "live:guest_unmuted": LIVE_EVENT.GUEST_UNMUTED,
      };

      const mappedType = socketToEvent[socketType];
      const userId = (data.userId || data.senderId) as string | undefined;
      const userName = (data.userName || data.senderName) as string | undefined;

      let dedupeKey: string | undefined;
      if (typeof data.eventId === "string") {
        dedupeKey = data.eventId;
      } else if (mappedType === LIVE_EVENT.JOIN && userId) {
        dedupeKey = `join:${userId}`;
      } else if (mappedType === LIVE_EVENT.LEAVE && userId) {
        dedupeKey = `leave:${userId}`;
      } else if (mappedType === LIVE_EVENT.GUEST_ON_STAGE && userId) {
        dedupeKey = `guest-on:${userId}`;
      } else if (mappedType === LIVE_EVENT.GUEST_OFF_STAGE && userId) {
        dedupeKey = `guest-off:${userId}:${String(data.targetUserId || userId)}`;
      } else if (mappedType === LIVE_EVENT.GUEST_MUTED) {
        dedupeKey = `guest-muted:${String(data.targetUserId || userId || "")}`;
      } else if (mappedType === LIVE_EVENT.GUEST_UNMUTED) {
        dedupeKey = `guest-unmuted:${String(data.targetUserId || userId || "")}`;
      } else if (mappedType === LIVE_EVENT.CHAT) {
        const mid = data.messageId as string | undefined;
        dedupeKey =
          mid ||
          `chat:${userId || "anon"}:${String(data.text || "")}:${String(data.sentAt || "")}`;
      } else if (mappedType === LIVE_EVENT.REACTION) {
        const rid = data.reactionId as string | undefined;
        dedupeKey =
          rid ||
          `reaction:${userId || "anon"}:${String(data.emoji || "")}:${String(data.sentAt || "")}`;
      } else if (mappedType === LIVE_EVENT.GIFT) {
        const gid = data.giftEventId as string | undefined;
        dedupeKey =
          gid ||
          `gift:${userId || "anon"}:${String(data.giftId || "")}:${String(data.sentAt || "")}`;
      } else if (mappedType === LIVE_EVENT.DONATION) {
        const did = data.donationEventId as string | undefined;
        dedupeKey =
          did ||
          `donation:${userId || "anon"}:${String(data.amount || "")}:${String(data.sentAt || "")}`;
      }

      ingestLiveEvent(
        { ...data, type: mappedType || data.type },
        { senderId: userId, senderName: userName, dedupeKey },
      );
    };

    let unbindLive: (() => void) | undefined;
    let liveSocket: ReturnType<typeof acquireLiveSocket> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const onGuestInvite = (payload: {
      callId?: string;
      guestUserId?: string;
      token?: string;
      uid?: number;
    }) => {
      const { effectiveIsHost: isHost, myUserId: uid } = ctx();
      if (isHost) return;
      if (payload.callId && payload.callId !== call.id) return;
      if (payload.guestUserId !== uid) return;
      if (!payload.token) return;
      setPendingGuestInvite({ token: payload.token, uid: payload.uid });
    };

    if (!SOCKET_IO_DISABLED_ON_HOST) {
      liveSocket = acquireLiveSocket(call.id);
      liveSocketRef.current = liveSocket;

      if (liveSocket) {
        unbindLive = bindLiveSignaling(liveSocket, {
          onLiveEvent: (socketType, data) => {
            if (data.callId && data.callId !== call.id) return;
            if (socketType === "live:ended") {
              handleRemoteLiveEnded();
              return;
            }
            mapSocketLivePayload(socketType, data);
          },
          onEnded: (data) => {
            if (data.callId && data.callId !== call.id) return;
            handleRemoteLiveEnded();
          },
          onSpeakDenied: (data) => {
            if (data.callId && data.callId !== call.id) return;
            ingestLiveEvent({
              type: LIVE_EVENT.SPEAK_DENIED,
              targetUserId: data.targetUserId,
            });
          },
          onGuestInvite,
        });
      }
    } else {
      let pollCursor = Date.now() - 15_000;

      const pollLiveEvents = async () => {
        try {
          const data = await fetchLiveEvents(call.id, pollCursor, myUserId);
          for (const ev of data.events ?? []) {
            const socketType =
              typeof ev.type === "string" ? ev.type : "live:chat";
            if (socketType === "live:ended") {
              handleRemoteLiveEnded();
              continue;
            }
            if (socketType === "live:speak_denied") {
              ingestLiveEvent({
                type: LIVE_EVENT.SPEAK_DENIED,
                targetUserId: ev.targetUserId as string | undefined,
              });
              continue;
            }
            if (socketType === "live:guest_invite") {
              onGuestInvite({
                callId: ev.callId as string | undefined,
                guestUserId: ev.guestUserId as string | undefined,
                token: ev.token as string | undefined,
                uid: typeof ev.uid === "number" ? ev.uid : undefined,
              });
              continue;
            }
            mapSocketLivePayload(socketType, ev);
          }
          if (typeof data.cursor === "number" && data.cursor > pollCursor) {
            pollCursor = data.cursor;
          } else if (typeof data.serverTime === "number") {
            pollCursor = Math.max(pollCursor, data.serverTime - 500);
          }
        } catch (e) {
          if (__DEV__) console.warn("[Live] poll error:", e);
        }
      };

      void pollLiveEvents();
      pollTimer = setInterval(pollLiveEvents, HOSTED_LIVE_POLL_MS);
    }

    return () => {
      unsubCustom();
      unbindLive?.();
      if (pollTimer) clearInterval(pollTimer);
      if (liveSocket) {
        releaseLiveSocket(call.id);
        if (liveSocketRef.current === liveSocket) {
          liveSocketRef.current = null;
        }
      }
    };
  }, [call?.id, effectiveIsHost, myUserId, handleRemoteLiveEnded]);

  const inviteToSpeak = useCallback(
    async (userId: string, userName: string) => {
      if (!call || !canModerate) return;
      try {
        await inviteLiveGuest({
          callId: call.id,
          hostClerkId: hostUserId || myUserId,
          guestUserId: userId,
          guestName: userName,
        });
        markGuestOnStage(userId, userName);
        setSpeakRequests((prev) => prev.filter((r) => r.userId !== userId));
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: "You",
            text: `invited ${userName} to speak`,
          }),
        );
      } catch (e) {
        console.log("invite to speak error:", e);
      }
    },
    [call, canModerate, hostUserId, myUserId, markGuestOnStage],
  );

  const denySpeakRequest = useCallback(
    async (userId: string, userName: string) => {
      if (!call || !canModerate) return;
      try {
        await denyLiveGuest({
          callId: call.id,
          guestUserId: userId,
          hostClerkId: hostUserId || myUserId,
        });
        setSpeakRequests((prev) => prev.filter((r) => r.userId !== userId));
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: "You",
            text: `declined ${userName}'s request`,
          }),
        );
      } catch (e) {
        console.log("deny speak error:", e);
      }
    },
    [call, canModerate, hostUserId, myUserId],
  );

  const requestToSpeak = useCallback(async () => {
    if (!call || effectiveIsHost) return;
    try {
      await call.sendCustomEvent({
        type: LIVE_EVENT.SPEAK_REQUEST,
        senderName: myName,
      });
      setMessages((prev) =>
        appendMessage(prev, {
          kind: "system",
          userName: myName,
          text: "requested to speak",
          userId: myUserId,
        }),
      );
    } catch (e) {
      console.log("speak request error:", e);
    }
  }, [call, effectiveIsHost, myName, myUserId]);

  const onTapVideo = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) emitReaction("❤️");
    lastTap.current = now;
  };

  const broadcastGift = useCallback(
    async (giftId: string) => {
      const gift = LIVE_GIFTS.find((g) => g.id === giftId);
      if (!gift || !call) return;
      const giftEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const sentAt = Date.now();
      pushGiftToast(gift.emoji, gift.label, myName, gift.amount);
      setMessages((prev) =>
        appendMessage(prev, {
          kind: "gift",
          userName: myName,
          text: `sent ${gift.label}`,
          giftEmoji: gift.emoji,
          userId: myUserId,
        }),
      );
      await call.sendCustomEvent({
        type: LIVE_EVENT.GIFT,
        giftId: gift.id,
        senderName: myName,
        giftEventId,
        sentAt,
      });
    },
    [call, myName, myUserId, pushGiftToast],
  );

  const broadcastDonation = useCallback(
    async (amount: number) => {
      if (!call) return;
      const donationEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const sentAt = Date.now();
      pushDonation(myName, amount, myUserId);
      await call.sendCustomEvent({
        type: LIVE_EVENT.DONATION,
        amount,
        senderName: myName,
        donationEventId,
        sentAt,
      });
    },
    [call, myName, myUserId, pushDonation],
  );

  const handleMpesaPay = useCallback(
    async (opts: {
      type: "gift" | "donation";
      giftId?: string;
      amount: number;
      phone: string;
    }): Promise<LivePayResult> => {
      if (!call || !userDetails?.clerkId) {
        return { ok: false, message: "Sign in to send gifts or donations." };
      }

      const result = await completeLiveMpesaPayment({
        clerkId: userDetails.clerkId,
        callId: call.id,
        phoneNumber: opts.phone,
        type: opts.type,
        giftId: opts.giftId,
        amount: opts.amount,
        hostUserId: call.state.createdBy?.id,
        senderName: myName,
      });

      if (result.ok && result.checkoutRequestId) {
        const key = result.checkoutRequestId;
        if (!broadcastedPaymentsRef.current.has(key)) {
          broadcastedPaymentsRef.current.add(key);
          try {
            if (opts.type === "gift" && opts.giftId) {
              await broadcastGift(opts.giftId);
            } else {
              await broadcastDonation(opts.amount);
            }
          } catch (e) {
            console.log("broadcast after pay error:", e);
            broadcastedPaymentsRef.current.delete(key);
            return {
              ok: false,
              message:
                "Payment succeeded but could not show on stream. Try again.",
            };
          }
        }
      }

      return result;
    },
    [broadcastDonation, broadcastGift, call, myName, userDetails?.clerkId],
  );

  const shareLive = useCallback(async () => {
    const liveCallId = call?.id;
    if (!liveCallId) return;
    const title = (custom as { title?: string })?.title || "Live stream";
    const hostName = primaryParticipant?.name || "Broadcaster";
    const url = Linking.createURL("/(drawer)/(live)", {
      queryParams: { callId: liveCallId },
    });
    try {
      await Share.share({
        message: `Join ${hostName} live: ${title}\n${url}`,
        url: Platform.OS === "ios" ? url : undefined,
      });
    } catch (e) {
      console.log("share live error:", e);
    }
  }, [call?.id, custom, primaryParticipant?.name]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !call) return;

    const msgId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const optimistic: LiveMessage = {
      id: msgId,
      kind: "chat",
      userId: myUserId,
      userName: myName,
      text,
      isHost: effectiveIsHost,
      createdAt: Date.now(),
    };
    setMessages((prev) => {
      const next = [...prev, optimistic];
      return next.length > LIVE_CHAT_VISIBLE_MAX
        ? next.slice(-LIVE_CHAT_VISIBLE_MAX)
        : next;
    });
    setInput("");
    requestAnimationFrame(() => chatInputRef.current?.focus());

    try {
      await call.sendCustomEvent({
        type: LIVE_EVENT.CHAT,
        text,
        senderName: myName,
        messageId: msgId,
        sentAt: optimistic.createdAt,
      });
    } catch (e) {
      console.log("chat send error:", e);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      Alert.alert(
        "Message not sent",
        "Could not send your comment. Check your connection and try again.",
      );
    }
  }, [call, effectiveIsHost, input, myName, myUserId]);

  /** Socket fallback if STK completes after poll timeout */
  useEffect(() => {
    if (!call?.id || !userDetails?.clerkId) return;

    const socket = io(API_PUBLIC_URL, { transports: ["websocket"] });
    socket.emit("joinRoom", call.id);

    const onPaid = async (data: {
      clerkId?: string;
      type?: string;
      giftId?: string;
      amount?: number;
      checkoutRequestId?: string;
    }) => {
      if (data.clerkId !== userDetails.clerkId) return;
      const key = data.checkoutRequestId ?? `${data.type}-${data.giftId}`;
      if (broadcastedPaymentsRef.current.has(key)) return;
      broadcastedPaymentsRef.current.add(key);
      try {
        if (data.type === "gift" && data.giftId) {
          await broadcastGift(data.giftId);
        } else if (data.type === "donation" && data.amount) {
          await broadcastDonation(data.amount);
        }
      } catch (e) {
        console.log("socket payment broadcast error:", e);
        broadcastedPaymentsRef.current.delete(key);
      }
    };

    socket.on("live_payment_completed", onPaid);
    return () => {
      socket.off("live_payment_completed", onPaid);
      socket.disconnect();
    };
  }, [
    broadcastDonation,
    broadcastGift,
    call?.id,
    userDetails?.clerkId,
  ]);

  const leaveViewer = async () => {
    try {
      await leaveLiveViewer(call?.id || "", myUserId, myName).catch(() => {});
      await call?.leave();
    } finally {
      goToHomeScreen();
    }
  };

  const endLiveHost = async () => {
    try {
      await call?.endCall();
    } catch (err) {
      console.log("end live error:", err);
    } finally {
      if (variant === "community") {
        clearActiveCommunityLiveSession();
      } else if (variant === "market") {
        clearActiveMarketLiveSession();
      }
      goToHomeScreen();
    }
  };

  const isReconnecting = String(callingState).toLowerCase().includes("reconnect");

  const hostDisplayName =
    hostProfile.name ||
    primaryParticipant?.name ||
    "Broadcaster";
  const hostDisplayImage = hostProfile.image ?? undefined;

  const activeSpeaker = useMemo(
    () =>
      participants.find((p) => p.isSpeaking && !p.isLocalParticipant) ??
      participants.find((p) => p.isSpeaking),
    [participants],
  );

  return (
    <LiveSwipeDeck
      enabled={!effectiveIsHost && !keyboardOpen && !!playlist?.length}
      callId={callId}
      playlist={playlist}
      initialIndex={initialIndex}
      onSwitchLive={onSwitchLive}
    >
    <View style={styles.root}>
      <MemoStageVideoLayout
        primary={primaryParticipant}
        localParticipant={localParticipant}
        onTapVideo={onTapVideo}
        isHost={effectiveIsHost}
        viewerOnStage={false}
      />

      <StreamConnectionOverlay />

      {!isReconnecting && networkTier !== "good" && (
        <SmoothModeOverlay tier={networkTier} />
      )}

      {!keyboardOpen ? (
        <LiveGuestStrip
          guests={miniParticipants}
          requests={canModerate ? speakRequests : []}
          topOffset={insets.top + TT.guestTop}
          activeSpeakerId={activeSpeaker?.sessionId}
          myUserId={myUserId}
          canModerate={canModerate}
          mutedUserIds={mutedGuestIds}
          mutingUserIds={mutingIds}
          onInvite={(userId, userName) => void inviteToSpeak(userId, userName)}
          onDecline={(userId, userName) =>
            void denySpeakRequest(userId, userName)
          }
          onToggleMute={(userId, userName, muted) =>
            void toggleGuestMute(userId, userName, muted)
          }
          onMuteAll={canModerate ? muteAllGuests : undefined}
          onRemoveGuest={(userId, userName) =>
            void removeGuestFromStage(userId, userName)
          }
          selfMicMuted={
            isGuestOnStage && !effectiveIsHost
              ? Boolean(mic?.optimisticIsMute)
              : false
          }
          profileImages={stageProfileImages}
        />
      ) : null}

      <LiveReactionsOverlay reactions={reactions} />

      {giftToasts.map((g) => (
        <FloatingGiftToast key={g.id} toast={g} />
      ))}

      {donationPopup && (
        <LiveDonationPopup
          toast={donationPopup}
          onDone={() => {
            setDonationPopup(null);
            donationShowingRef.current = false;
            setTimeout(() => flushDonationQueue(), 400);
          }}
        />
      )}

      {fullScreenGift ? (
        <LiveFullScreenGift
          gift={fullScreenGift}
          onDone={() => setFullScreenGift(null)}
        />
      ) : null}

      <LiveTopBar
        hostName={hostDisplayName}
        hostImage={hostDisplayImage}
        hostVerified={hostProfile.verified}
        streamTitle={(custom as { title?: string })?.title}
        viewerCount={viewerCount}
        streamDuration={streamDuration}
        isHost={effectiveIsHost}
        topInset={insets.top}
        showFollow={showFollowBtn}
        isFollowing={isFollowingHost}
        followLoading={followBusy}
        onFollow={onFollowHost}
        onClose={effectiveIsHost ? endLiveHost : goToHomeScreen}
        onShare={shareLive}
      />

      <LiveActionRail
        hidden={keyboardOpen}
        likeCount={likeCount}
        hostImage={hostDisplayImage}
        hostInitial={hostDisplayName}
        showFollow={showFollowBtn}
        isFollowing={isFollowingHost}
        onFollow={onFollowHost}
        heartBurstKey={heartBurstKey}
        onGift={() => {
          setMpesaTab("gift");
          setShowGiftPicker(true);
        }}
        onDonate={() => {
          setMpesaTab("donate");
          setShowGiftPicker(true);
        }}
        onShare={shareLive}
        onHeart={() => emitReaction("❤️")}
      />

      {variant === "market" && !keyboardOpen && hostClerkId ? (
        <LiveProductsDropdown
          hostUserId={hostClerkId}
          topOffset={insets.top + 56}
        />
      ) : null}

      {/* BOTTOM DOCK — sits above keyboard (chat → input → controls) */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomFade,
          { bottom: dockBottom, height: fadeHeight },
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.55)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[
          styles.keyboardDockWrap,
          { bottom: dockBottom, paddingBottom: dockPadBottom },
        ]}
        keyboardVerticalOffset={0}
      >
        <View style={styles.bottomDockInner}>
          {pendingGuestInvite && !effectiveIsHost ? (
            <View style={styles.guestInviteBar}>
              <Text style={styles.guestInviteText}>
                Host invited you to join on stage
              </Text>
              <View style={styles.guestInviteActions}>
                <Pressable
                  style={styles.guestInviteDecline}
                  onPress={() => void declineGuestInvite()}
                >
                  <Text style={styles.guestInviteDeclineText}>Decline</Text>
                </Pressable>
                <Pressable
                  style={styles.guestInviteAccept}
                  onPress={() => void acceptGuestInvite()}
                >
                  <Text style={styles.guestInviteAcceptText}>Accept</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <LiveChatPanel
            messages={messages}
            maxHeight={chatMaxHeight}
            hostUserId={hostUserId}
          />

          <View style={styles.inputRow}>
            <TextInput
              ref={chatInputRef}
              placeholder="Add comment..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={input}
              onChangeText={setInput}
              style={styles.input}
              returnKeyType="send"
              blurOnSubmit={false}
              submitBehavior="submit"
              onSubmitEditing={() => void sendMessage()}
            />
            {input.trim().length > 0 ? (
              <Pressable
                onPress={() => void sendMessage()}
                style={styles.sendBtn}
              >
                <Ionicons name="arrow-up" size={18} color="#fff" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => emitReaction("❤️")}
                style={styles.emojiBtn}
              >
                <Ionicons name="happy-outline" size={22} color="#fff" />
              </Pressable>
            )}
          </View>

          {!keyboardOpen && effectiveIsHost && (
            <LiveHostControlsBar
              micMuted={Boolean(mic?.optimisticIsMute)}
              cameraEnabled={Boolean(cam?.isEnabled)}
              onToggleMic={() => call?.microphone.toggle()}
              onToggleCamera={() => call?.camera.toggle()}
              onFlipCamera={() => call?.camera.flip()}
              onEndStream={endLiveHost}
            />
          )}

          {!keyboardOpen && !effectiveIsHost && (
            <View style={styles.ttViewerBarInline}>
              {!isGuestOnStage ? (
                <Pressable style={styles.ttViewerPill} onPress={requestToSpeak}>
                  <Ionicons name="hand-right" size={16} color="#fff" />
                  <Text style={styles.ttViewerPillText}>Request</Text>
                </Pressable>
              ) : (
                <View style={styles.ttStageActions}>
                  <Pressable
                    style={[styles.ttViewerPill, styles.ttLeaveStage]}
                    onPress={() => void exitStage()}
                  >
                    <Ionicons name="close-circle" size={16} color="#fff" />
                    <Text style={styles.ttViewerPillText}>Leave stage</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.ttViewerPill,
                      styles.ttStageMic,
                      Boolean(mic?.optimisticIsMute) && styles.ttStageMicMuted,
                    ]}
                    onPress={() => call?.microphone.toggle()}
                  >
                    <Ionicons
                      name={mic?.optimisticIsMute ? "mic-off" : "mic"}
                      size={18}
                      color="#fff"
                    />
                  </Pressable>
                </View>
              )}
              <Pressable
                style={[styles.ttViewerPill, styles.ttLeave]}
                onPress={leaveViewer}
              >
                <Text style={styles.ttViewerPillText}>Leave</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <LiveMpesaSheet
        visible={showGiftPicker}
        initialTab={mpesaTab}
        topDonors={topDonors}
        onClose={() => setShowGiftPicker(false)}
        pay={handleMpesaPay}
      />
    </View>
    </LiveSwipeDeck>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function LiveSwipeDeck({
  children,
  enabled,
  callId,
  playlist,
  initialIndex,
  onSwitchLive,
}: {
  children: React.ReactNode;
  enabled: boolean;
  callId: string;
  playlist?: string[];
  initialIndex: number;
  onSwitchLive?: (callId: string, index: number) => void;
}) {
  const translateY = useSharedValue(0);
  const currentIndex = useMemo(() => {
    const index = playlist?.indexOf(callId) ?? -1;
    return index >= 0 ? index : initialIndex;
  }, [callId, initialIndex, playlist]);

  const switchTo = useCallback(
    (direction: 1 | -1) => {
      if (!playlist?.length || !onSwitchLive) return;
      const nextIndex = currentIndex + direction;
      const nextCallId = playlist[nextIndex];
      if (!nextCallId) return;
      onSwitchLive(nextCallId, nextIndex);
    },
    [currentIndex, onSwitchLive, playlist],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetY([-12, 12])
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
          translateY.value = event.translationY * 0.18;
        })
        .onEnd((event) => {
          const canGoPrev = currentIndex > 0;
          const canGoNext = !!playlist?.[currentIndex + 1];
          if (event.translationY > LIVE_SWIPE_THRESHOLD && canGoPrev) {
            runOnJS(switchTo)(-1);
          } else if (event.translationY < -LIVE_SWIPE_THRESHOLD && canGoNext) {
            runOnJS(switchTo)(1);
          }
          translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        })
        .onFinalize(() => {
          translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        }),
    [currentIndex, enabled, playlist, switchTo, translateY],
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!playlist?.length) {
    return <View style={styles.swipeDeck}>{children}</View>;
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.swipeDeck, style]}>
        {children}
        {enabled ? (
          <>
            <View pointerEvents="none" style={styles.preloadHintTop}>
              {currentIndex > 0 ? <View style={styles.preloadDot} /> : null}
            </View>
            <View pointerEvents="none" style={styles.preloadHintBottom}>
              {playlist[currentIndex + 1] ? (
                <View style={styles.preloadDot} />
              ) : null}
            </View>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function ReconnectingOverlay() {
  return (
    <View style={styles.reconnectingOverlay} pointerEvents="none">
      <ActivityIndicator size="small" color="#fff" />
      <Text style={styles.reconnectingText}>Reconnecting…</Text>
    </View>
  );
}

function SmoothModeOverlay({ tier }: { tier: NetworkTier }) {
  return (
    <View style={styles.smoothModeOverlay} pointerEvents="none">
      <Ionicons
        name={tier === "poor" ? "cloud-offline-outline" : "cellular-outline"}
        size={13}
        color="#fff"
      />
      <Text style={styles.smoothModeText}>
        {tier === "poor" ? "Reconnecting…" : "Smooth mode"}
      </Text>
    </View>
  );
}

function StageVideoLayout({
  primary,
  localParticipant,
  onTapVideo,
  isHost,
  viewerOnStage = false,
}: {
  primary?: EnrichedRtcParticipant;
  localParticipant?: EnrichedRtcParticipant;
  onTapVideo: () => void;
  isHost: boolean;
  viewerOnStage?: boolean;
}) {
  const stageParticipant = isHost
    ? localParticipant ?? primary
    : primary;

  const showLocalVideo =
    Boolean(stageParticipant?.isLocalParticipant) && (isHost || viewerOnStage);

  return (
    <Pressable style={styles.videoTouch} onPress={onTapVideo}>
      {!stageParticipant && <StreamSkeleton />}
      {stageParticipant ? (
        <View style={styles.videoStage}>
          {showLocalVideo ? (
            <RtcLocalVideoView style={styles.videoStage} />
          ) : (
            <RtcRemoteVideoView
              uid={stageParticipant.uid}
              style={styles.videoStage}
            />
          )}
        </View>
      ) : (
        <View style={styles.waitingVideo}>
          <Text style={{ color: "#fff" }}>
            {isHost ? "Starting camera…" : "Waiting for livestream..."}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const MemoStageVideoLayout = React.memo(StageVideoLayout);

function StreamSkeleton() {
  return (
    <LinearGradient
      colors={["#080808", "#171717", "#080808"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

function TikTokIconBtn({
  icon,
  onPress,
  danger = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.ttHostBtn, danger && styles.ttHostBtnDanger]}
    >
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

function FloatingGiftToast({
  toast,
}: {
  toast: { emoji: string; label: string; senderName: string };
}) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    y.value = withTiming(-200, { duration: 2800 });
    opacity.value = withTiming(0, { duration: 2800 });
  }, [opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.giftToast, style]}>
      <Text style={styles.giftToastEmoji}>{toast.emoji}</Text>
      <View style={styles.giftToastMeta}>
        <Text style={styles.giftToastSender} numberOfLines={1}>
          {toast.senderName}
        </Text>
        <Text style={styles.giftToastLabel}>sent {toast.label}</Text>
      </View>
    </Animated.View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  joiningRoot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  joiningText: { color: "#fff", fontSize: 14, opacity: 0.85 },
  joinErrorRoot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  joinErrorText: { color: "#fff", fontSize: 15, textAlign: "center" },
  joinErrorBtn: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  joinErrorBtnText: { color: "#fff", fontWeight: "600" },
  root: { flex: 1, backgroundColor: "#000" },
  swipeDeck: { flex: 1, backgroundColor: "#000" },
  preloadHintTop: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 40,
  },
  preloadHintBottom: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 40,
  },
  preloadDot: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  reconnectingOverlay: {
    position: "absolute",
    top: 96,
    alignSelf: "center",
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  reconnectingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  smoothModeOverlay: {
    position: "absolute",
    top: 96,
    alignSelf: "center",
    zIndex: 29,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  smoothModeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  videoTouch: { flex: 1 },
  videoStage: { ...StyleSheet.absoluteFillObject },
  waitingVideo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  miniPanelsColumn: {
    position: "absolute",
    top: 88,
    right: 68,
    zIndex: 15,
    gap: 8,
  },
  miniPanel: {
    width: 96,
    height: 128,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "#111",
  },
  miniLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  miniLabelText: { color: "#fff", fontSize: 9, fontWeight: "700" },

  topBar: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MediaColors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  hostRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MediaColors.glass,
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
  },
  hostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MediaColors.liveRed,
    alignItems: "center",
    justifyContent: "center",
  },
  hostInitial: { color: "#fff", fontWeight: "800", fontSize: 15 },
  hostMeta: { flex: 1, marginLeft: 8 },
  hostName: { color: "#fff", fontWeight: "800", fontSize: 13 },
  streamTitle: { color: MediaColors.textSecondary, fontSize: 10, marginTop: 1 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rightRail: {
    position: "absolute",
    right: 10,
    bottom: 280,
    zIndex: 20,
    alignItems: "center",
    gap: 14,
  },
  railBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MediaColors.glass,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
  },
  railEmoji: { fontSize: 23 },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MediaColors.liveRed,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 6,
  },

  liveBadgeText: { color: "#fff", fontWeight: "700", fontSize: 11 },

  viewersPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.75)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },

  viewersText: { color: "#fff", fontWeight: "700" },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MediaColors.glass,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
  },

  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  keyboardDockWrap: {
    position: "absolute",
    left: TT.dockLeft,
    right: TT.dockRightInset,
    zIndex: 28,
  },
  bottomDockInner: {
    width: "100%",
    paddingTop: 2,
  },
  guestInviteBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(37,244,238,0.16)",
    borderWidth: 1,
    borderColor: "rgba(37,244,238,0.45)",
  },
  guestInviteText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  guestInviteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guestInviteDecline: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  guestInviteDeclineText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700",
  },
  guestInviteAccept: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: TT.accentCyan,
  },
  guestInviteAcceptText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  chatWrap: {
    width: "100%",
    overflow: "hidden",
    marginBottom: 6,
  },
  chatMask: { flex: 1, width: "100%" },
  chatList: { flexGrow: 0 },
  chatListContent: { paddingTop: 4, paddingBottom: 4 },
  hidden: { opacity: 0 },

  hostPanel: {
    position: "absolute",
    left: TT.dockLeft,
    right: TT.dockRightInset,
    zIndex: 25,
  },
  speakRequestToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(123,47,247,0.92)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
    alignSelf: "stretch",
  },
  speakRequestToggleText: {
    flex: 1,
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  speakRequestBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  speakRequestBadgeText: {
    color: "#7B2FF7",
    fontWeight: "800",
    fontSize: 11,
  },
  speakRequestList: {
    marginTop: -4,
    marginBottom: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    padding: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
  },
  speakRequestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  speakRequestName: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  speakRowInviteBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  speakRowInviteText: { color: "#7B2FF7", fontWeight: "800", fontSize: 11 },
  speakRowDenyBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  speakRowDenyText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  speakRequestBanner: {
    backgroundColor: "rgba(123,47,247,0.92)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
  },
  speakRequestTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 8,
  },
  speakRequestActions: { flexDirection: "row", gap: 8 },
  speakAcceptBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  speakAcceptText: { color: "#7B2FF7", fontWeight: "800", fontSize: 12 },
  speakDenyBtn: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  speakDenyText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  guestsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: MediaColors.glass,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
    alignSelf: "flex-start",
  },
  guestsToggleText: { color: "#fff", fontSize: 11, fontWeight: "700", flex: 1 },
  guestsList: {
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    padding: 8,
    maxHeight: 160,
  },
  guestsEmpty: { color: MediaColors.textSecondary, fontSize: 11, padding: 8 },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  guestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MediaColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  guestInitial: { color: "#fff", fontWeight: "800", fontSize: 13 },
  guestName: { flex: 1, color: "#fff", fontSize: 12, fontWeight: "600" },
  inviteBtn: {
    backgroundColor: MediaColors.liveRed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteBtnText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  chatBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
    maxWidth: "88%",
  },
  chatBubbleJoin: {
    backgroundColor: "rgba(37,244,238,0.15)",
    alignSelf: "center",
  },
  chatBubbleSystem: {
    backgroundColor: "rgba(123,47,247,0.2)",
    alignSelf: "center",
  },
  chatUser: {
    color: MediaColors.accentCyan,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  chatJoin: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  chatSystem: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "600" },
  chatMsg: { color: "#fff", fontSize: 12, lineHeight: 18 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },

  input: {
    flex: 1,
    backgroundColor: TT.inputBg,
    color: "#fff",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },

  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TT.liveRed,
    alignItems: "center",
    justifyContent: "center",
  },

  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TT.pillBg,
    alignItems: "center",
    justifyContent: "center",
  },

  ttHostBarInline: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginTop: 10,
    paddingBottom: 4,
  },
  ttHostBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TT.pillBg,
    alignItems: "center",
    justifyContent: "center",
  },
  ttHostBtnDanger: { backgroundColor: TT.liveRed },

  ttViewerBarInline: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingBottom: 4,
  },
  ttViewerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TT.pillBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ttLeave: { backgroundColor: "rgba(220,38,38,0.85)", marginLeft: "auto" },
  ttLeaveStage: {
    backgroundColor: "rgba(123,47,247,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  ttStageActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ttStageMic: {
    paddingHorizontal: 12,
    minWidth: 44,
    justifyContent: "center",
  },
  ttStageMicMuted: {
    backgroundColor: "rgba(239,68,68,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  ttViewerPillText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  floatingReaction: { fontSize: 29 },

  giftToast: {
    position: "absolute",
    left: TT.dockLeft,
    bottom: TT.railBottom + 120,
    zIndex: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.45)",
    maxWidth: SCREEN_W * 0.72,
    gap: 8,
  },
  giftToastEmoji: { fontSize: 31 },
  giftToastMeta: { flex: 1 },
  giftToastSender: { color: "#fff", fontWeight: "800", fontSize: 12 },
  giftToastLabel: { color: MediaColors.accentCyan, fontSize: 10, marginTop: 2 },

  giftModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  giftModalSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 12,
  },
  giftModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  giftModalTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  giftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  giftCell: {
    width: (SCREEN_W - 52) / 4,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  giftCellEmoji: { fontSize: 27 },
  giftCellLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  giftCellCoins: {
    color: MediaColors.textSecondary,
    fontSize: 8,
    marginTop: 2,
  },
});
