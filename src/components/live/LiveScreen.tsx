import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StreamCall,
  VideoRenderer,
  useCall,
  useCallStateHooks,
  callManager,
  useStreamVideoClient,
  CallingState,
  OwnCapability,
} from "@stream-io/video-react-native-sdk";
import type { StreamVideoParticipant } from "@stream-io/video-client";
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
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaColors } from "@/constants/mediaTheme";
import { useLevel } from "@/context/LevelContext";
import { useFollowContext } from "@/context/FollowContext";
import { useLiveKeyboardInset } from "@/hooks/live/useLiveKeyboardInset";
import {
  LIVE_EVENT,
  LIVE_GIFTS,
  LIVE_JOIN_TOAST_MS,
  LIVE_CHAT_VISIBLE_MAX,
  appendMessage,
  type LiveMessage,
  type SpeakRequest,
  type JoinToast,
  type DonationToast,
} from "@/utils/livestreamSession";
import { LiveJoinToastLayer } from "./LiveJoinToastLayer";
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
import { LiveMpesaSheet } from "./LiveMpesaSheet";
import { LiveDonationPopup } from "./LiveDonationPopup";
import {
  completeLiveMpesaPayment,
  type LivePayResult,
} from "@/utils/livePayments";
import { API_PUBLIC_URL } from "@/constants/api";
import { notifyLiveStarted } from "@/utils/notifyLiveStarted";
import { io } from "socket.io-client";
import {
  buildMarketLiveCustom,
  productFromLiveCustom,
  type MarketLiveProduct,
} from "@/utils/marketLive";
import { LiveProductOverlay } from "@/components/live/LiveProductOverlay";
import { LivePinProductSheet } from "@/components/live/LivePinProductSheet";
import { MarketLiveProductRail } from "@/components/market/MarketLiveProductRail";
import { PresenceAvatar } from "@/components/presence/PresenceAvatar";

const { width: SCREEN_W } = Dimensions.get("window");

type Props = {
  goToHomeScreen: () => void;
  callId: string;
  isHost?: boolean;
  roomTitle?: string;
  level?: string;
  variant?: "community" | "market";
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
};

export default function LiveScreen({
  goToHomeScreen,
  callId,
  isHost = false,
  roomTitle,
  level,
  variant = "community",
  productId,
  productTitle,
  productPrice,
  productImage,
}: Props) {
  const client = useStreamVideoClient();
  const { userDetails } = useLevel();
  const insets = useSafeAreaInsets();
  const liveNotifySentRef = useRef(false);
  const [call, setCall] = useState<ReturnType<
    NonNullable<typeof client>["call"]
  > | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinGenRef = useRef(0);
  const goHomeRef = useRef(goToHomeScreen);
  goHomeRef.current = goToHomeScreen;

  const streamCall = useMemo(() => {
    if (!client) return null;
    return client.call("livestream", callId);
  }, [client, callId]);
  const initialMarketProduct = useMemo<MarketLiveProduct | null>(() => {
    if (variant !== "market" || !productId) return null;
    return {
      productId,
      title: productTitle || "Product",
      price: Number(productPrice) || 0,
      image: productImage,
    };
  }, [variant, productId, productTitle, productPrice, productImage]);

  useEffect(() => {
    liveNotifySentRef.current = false;
  }, [callId]);

  useEffect(() => {
    if (!streamCall) return;

    const gen = ++joinGenRef.current;
    let active = true;

    const join = async () => {
      try {
        setJoinError(null);

        if (isHost) {
          await streamCall.getOrCreate({
            data: {
              custom: {
                ...(variant === "market"
                  ? buildMarketLiveCustom({
                      hostClerkId: userDetails?.clerkId || "",
                      roomTitle,
                      level,
                      product: initialMarketProduct,
                    })
                  : {
                      title: roomTitle ?? "Live",
                      level: level ?? "home",
                    }),
              },
            },
          });
          await streamCall.join({ create: true });
          await streamCall.camera.enable();
          await streamCall.microphone.enable();
          await streamCall.goLive();
          callManager.start({
            audioRole: "communicator",
            deviceEndpointType: "speaker",
          });

          if (userDetails?.clerkId && !liveNotifySentRef.current) {
            liveNotifySentRef.current = true;
            void notifyLiveStarted({
              hostClerkId: userDetails.clerkId,
              callId,
              title: roomTitle,
              level,
            });
          }
        } else {
          await streamCall.join({ create: false });
        }

        if (!active || joinGenRef.current !== gen) {
          await streamCall.leave().catch(() => {});
          callManager.stop();
          return;
        }

        setCall(streamCall);
      } catch (err) {
        console.log("join live error:", err);
        if (active && joinGenRef.current === gen) {
          setJoinError("Could not join the live stream.");
        }
      }
    };

    join();

    const handleEnded = () => {
      if (active) goHomeRef.current();
    };

    streamCall.on("call.ended", handleEnded);

    return () => {
      active = false;
      streamCall.off("call.ended", handleEnded);
      streamCall.leave().catch(() => {});
      callManager.stop();
      setCall(null);
    };
  }, [
    streamCall,
    callId,
    isHost,
    roomTitle,
    level,
    userDetails?.clerkId,
    variant,
    initialMarketProduct,
  ]);

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
    <StreamCall call={call}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <LeaveStateHandler goToHomeScreen={goToHomeScreen} />
      <LiveCanvas
        isHost={isHost}
        variant={variant}
        initialMarketProduct={initialMarketProduct}
        goToHomeScreen={goToHomeScreen}
        insetsBottom={insets.bottom}
      />
    </StreamCall>
  );
}

/* ---------------- STATE HANDLER ---------------- */

function LeaveStateHandler({ goToHomeScreen }: { goToHomeScreen: () => void }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  useEffect(() => {
    if (callingState === CallingState.LEFT) goToHomeScreen();
  }, [callingState, goToHomeScreen]);

  return null;
}

/* ---------------- LIVE CANVAS ---------------- */

function LiveCanvas({
  isHost,
  variant,
  initialMarketProduct,
  goToHomeScreen,
  insetsBottom,
}: {
  isHost: boolean;
  variant: "community" | "market";
  initialMarketProduct: MarketLiveProduct | null;
  goToHomeScreen: () => void;
  insetsBottom: number;
}) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) {
    return (
      <View style={styles.joiningRoot}>
        <ActivityIndicator size="large" color="#FE2C55" />
        <Text style={styles.joiningText}>Connecting…</Text>
      </View>
    );
  }

  return (
    <LiveCanvasJoined
      isHost={isHost}
      variant={variant}
      initialMarketProduct={initialMarketProduct}
      goToHomeScreen={goToHomeScreen}
      insetsBottom={insetsBottom}
    />
  );
}

function LiveCanvasJoined({
  isHost,
  variant,
  initialMarketProduct,
  goToHomeScreen,
  insetsBottom,
}: {
  isHost: boolean;
  variant: "community" | "market";
  initialMarketProduct: MarketLiveProduct | null;
  goToHomeScreen: () => void;
  insetsBottom: number;
}) {
  const insets = useSafeAreaInsets();
  const call = useCall();
  const { userDetails } = useLevel();

  const {
    useLocalParticipant,
    useParticipants,
    useParticipantCount,
    useMicrophoneState,
    useCameraState,
    useCallCustomData,
    useHasPermissions,
  } = useCallStateHooks();
  const custom = useCallCustomData();
  const marketProductFromCall = useMemo(
    () => productFromLiveCustom(custom as Record<string, unknown> | undefined),
    [custom],
  );

  const localParticipant = useLocalParticipant();
  const participants = useParticipants();
  const hostUserId = call?.state.createdBy?.id;
  const canUpdatePermissions = useHasPermissions(
    OwnCapability.UPDATE_CALL_PERMISSIONS,
  );
  const canMuteUsers = useHasPermissions(OwnCapability.MUTE_USERS);
  const canModerate = isHost || canUpdatePermissions || canMuteUsers;

  const myUserId = localParticipant?.userId;
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
    },
  ]);
  const [pinnedProduct, setPinnedProduct] = useState<MarketLiveProduct | null>(
    initialMarketProduct ?? marketProductFromCall,
  );
  const [pinSheetVisible, setPinSheetVisible] = useState(false);

  useEffect(() => {
    if (!pinnedProduct && marketProductFromCall) {
      setPinnedProduct(marketProductFromCall);
    }
  }, [marketProductFromCall, pinnedProduct]);
  const [speakRequests, setSpeakRequests] = useState<SpeakRequest[]>([]);
  const [showGuests, setShowGuests] = useState(false);
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
  const [joinToasts, setJoinToasts] = useState<JoinToast[]>([]);
  const [donationPopup, setDonationPopup] = useState<DonationToast | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const { inset: keyboardInset, open: keyboardOpen } = useLiveKeyboardInset();
  const { handleFollow, following } = useFollowContext();
  const lastTap = useRef(0);
  const reactionTapTimes = useRef<number[]>([]);
  const announcedJoins = useRef(new Set<string>());
  const donationQueueRef = useRef<DonationToast[]>([]);
  const donationShowingRef = useRef(false);
  const broadcastedPaymentsRef = useRef(new Set<string>());

  const isPublishingVideo = (p: (typeof participants)[0]) =>
    p.publishedTracks?.some(
      (t) => t === 2 || String(t).toLowerCase().includes("video"),
    );

  const guestViewers = useMemo(
    () =>
      participants.filter(
        (p) =>
          !p.isLocalParticipant &&
          !isPublishingVideo(p) &&
          p.userId !== call?.state.createdBy?.id,
      ),
    [participants, call?.state.createdBy?.id],
  );

  const onStage = useMemo(
    () => participants.filter((p) => isPublishingVideo(p)),
    [participants],
  );

  const primaryParticipant = useMemo(() => {
    if (isHost && localParticipant) return localParticipant;
    const hostPublishing = participants.find(
      (p) => p.userId === hostUserId && isPublishingVideo(p),
    );
    if (hostPublishing) return hostPublishing;
    const hostAny = participants.find((p) => p.userId === hostUserId);
    if (hostAny) return hostAny;
    return (
      onStage[0] ??
      participants.find((p) => !p.isLocalParticipant) ??
      localParticipant
    );
  }, [isHost, localParticipant, participants, hostUserId, onStage]);

  const miniParticipants = useMemo(() => {
    if (!primaryParticipant) return [];
    return onStage.filter(
      (p) => p.sessionId !== primaryParticipant.sessionId,
    );
  }, [onStage, primaryParticipant]);

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

  const pushJoinToast = useCallback((userName: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setJoinToasts((prev) => [...prev, { id, userName }].slice(-4));
    setMessages((prev) =>
      appendMessage(prev, {
        kind: "join",
        userName,
        text: `${userName} joined`,
        expiresAt: Date.now() + LIVE_JOIN_TOAST_MS,
      }),
    );
  }, []);

  const bumpLikes = useCallback((n = 1) => {
    setLikeCount((c) => c + n);
  }, []);

  const pushReaction = useCallback(
    (emoji: string, left: number) => {
      if (emoji === "❤️" || emoji === "heart") bumpLikes(1);
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
      reactionTapTimes.current = reactionTapTimes.current.filter(
        (t) => now - t < 700,
      );
      reactionTapTimes.current.push(now);
      const burst = shouldBurstReaction(reactionTapTimes.current);
      const positions = burst
        ? spawnBurstPositions(10, TT.reactionSpawnX)
        : [TT.reactionSpawnX + (Math.random() * 40 - 20)];
      positions.forEach((left) => pushReaction(emoji, left));
      void (async () => {
        if (!call) return;
        try {
          await call.sendCustomEvent({
            type: LIVE_EVENT.REACTION,
            emoji,
            left: positions[0],
            burst,
          });
        } catch (e) {
          console.log("reaction send error:", e);
        }
      })();
    },
    [call, pushReaction],
  );

  const pushGiftToast = useCallback(
    (emoji: string, label: string, senderName: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setGiftToasts((prev) => [...prev, { id, emoji, label, senderName }]);
      setTimeout(() => {
        setGiftToasts((prev) => prev.filter((g) => g.id !== id));
      }, 3200);
    },
    [],
  );

  const chatMaxHeight = useMemo(() => {
    const base = keyboardOpen ? TT.chatHeightKeyboard : TT.chatHeight;
    return canModerate ? base - 20 : base;
  }, [canModerate, keyboardOpen]);

  const dockPaddingClosed = Math.max(insetsBottom + 6, 10);
  const controlsBlockHeight = isHost ? 58 : 48;
  const dockBottom = keyboardOpen ? keyboardInset : 0;
  const dockPadBottom = keyboardOpen ? 8 : dockPaddingClosed;
  const fadeHeight =
    chatMaxHeight + (keyboardOpen ? 56 : controlsBlockHeight + 72);

  const hostClerkId = hostUserId;
  const showFollowBtn =
    !isHost && !!hostClerkId && hostClerkId !== myUserId;
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
    if (!call) return;

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

    const onCustom = (event: {
      custom?: Record<string, unknown>;
      user?: { id?: string; name?: string };
    }) => {
      const payload = resolvePayload(event);
      const senderId = event.user?.id;
      const senderName = event.user?.name || "Viewer";

      if (!payload?.type) return;

      if (payload.type === LIVE_EVENT.CHAT && typeof payload.text === "string") {
        if (senderId === myUserId) return;
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "chat",
            userId: senderId,
            userName: senderName,
            text: payload.text as string,
          }),
        );
        return;
      }

      if (
        payload.type === LIVE_EVENT.REACTION &&
        typeof payload.emoji === "string"
      ) {
        if (senderId === myUserId) return;
        const baseLeft =
          typeof payload.left === "number"
            ? payload.left
            : TT.reactionSpawnX + (Math.random() * 40 - 20);
        const positions = payload.burst
          ? spawnBurstPositions(10, baseLeft)
          : [baseLeft];
        if (payload.emoji === "❤️") bumpLikes(1);
        positions.forEach((left) => pushReaction(payload.emoji as string, left));
        return;
      }

      if (
        payload.type === LIVE_EVENT.GIFT &&
        typeof payload.giftId === "string"
      ) {
        if (senderId === myUserId) return;
        const gift = LIVE_GIFTS.find((g) => g.id === payload.giftId);
        if (!gift) return;
        const sender = (payload.senderName as string) || senderName;
        pushGiftToast(gift.emoji, gift.label, sender);
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: sender,
            text: `sent ${gift.emoji} ${gift.label}`,
            userId: senderId,
          }),
        );
        return;
      }

      if (
        payload.type === LIVE_EVENT.DONATION &&
        typeof payload.amount === "number"
      ) {
        if (senderId === myUserId) return;
        pushDonation(
          (payload.senderName as string) || senderName,
          payload.amount,
          senderId,
        );
        return;
      }

      if (payload.type === LIVE_EVENT.SPEAK_REQUEST && senderId) {
        if (!canModerate) return;
        setSpeakRequests((prev) => {
          if (prev.some((r) => r.userId === senderId)) return prev;
          return [...prev, { userId: senderId, userName: senderName }];
        });
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: senderName,
            text: "requested to speak",
            userId: senderId,
          }),
        );
        return;
      }

      if (
        payload.type === LIVE_EVENT.SPEAK_INVITE &&
        payload.targetUserId === myUserId
      ) {
        setMessages((prev) =>
          appendMessage(prev, {
            kind: "system",
            userName: "Host",
            text: "invited you to speak — camera starting…",
          }),
        );
        void (async () => {
          try {
            await call.camera.enable();
            await call.microphone.enable();
          } catch (e) {
            console.log("speak invite accept error:", e);
          }
        })();
        return;
      }

      if (
        payload.type === LIVE_EVENT.SPEAK_DENIED &&
        payload.targetUserId === myUserId
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

    const onJoined = (event: {
      participant?: { user?: { id?: string; name?: string } };
    }) => {
      const userId = event.participant?.user?.id;
      const name = event.participant?.user?.name || "Someone";
      if (!userId || userId === myUserId) return;
      if (announcedJoins.current.has(userId)) return;
      announcedJoins.current.add(userId);
      pushJoinToast(name);
    };

    const unsubCustom = call.on("custom", onCustom);
    const unsubJoin = call.on("call.session_participant_joined", onJoined);

    return () => {
      unsubCustom();
      unsubJoin();
    };
  }, [
    call,
    canModerate,
    myUserId,
    pushReaction,
    pushGiftToast,
    pushDonation,
    pushJoinToast,
    bumpLikes,
  ]);

  const inviteToSpeak = useCallback(
    async (userId: string, userName: string) => {
      if (!call || !canModerate) return;
      try {
        await call.grantPermissions(userId, [
          OwnCapability.SEND_AUDIO,
          OwnCapability.SEND_VIDEO,
        ]);
        await call.sendCustomEvent({
          type: LIVE_EVENT.SPEAK_INVITE,
          targetUserId: userId,
        });
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
    [call, canModerate],
  );

  const denySpeakRequest = useCallback(
    async (userId: string, userName: string) => {
      if (!call || !canModerate) return;
      try {
        await call.sendCustomEvent({
          type: LIVE_EVENT.SPEAK_DENIED,
          targetUserId: userId,
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
    [call, canModerate],
  );

  const requestToSpeak = useCallback(async () => {
    if (!call || isHost) return;
    try {
      await call.sendCustomEvent({ type: LIVE_EVENT.SPEAK_REQUEST });
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
  }, [call, isHost, myName, myUserId]);

  const onTapVideo = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) emitReaction("❤️");
    lastTap.current = now;
  };

  const broadcastGift = useCallback(
    async (giftId: string) => {
      const gift = LIVE_GIFTS.find((g) => g.id === giftId);
      if (!gift || !call) return;
      pushGiftToast(gift.emoji, gift.label, myName);
      setMessages((prev) =>
        appendMessage(prev, {
          kind: "system",
          userName: myName,
          text: `sent ${gift.emoji} ${gift.label}`,
          userId: myUserId,
        }),
      );
      await call.sendCustomEvent({
        type: LIVE_EVENT.GIFT,
        giftId: gift.id,
        senderName: myName,
      });
    },
    [call, myName, myUserId, pushGiftToast],
  );

  const broadcastDonation = useCallback(
    async (amount: number) => {
      if (!call) return;
      pushDonation(myName, amount, myUserId);
      await call.sendCustomEvent({
        type: LIVE_EVENT.DONATION,
        amount,
        senderName: myName,
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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !call) return;

    const msgId = `${Date.now()}-${Math.random()}`;
    const optimistic: LiveMessage = {
      id: msgId,
      kind: "chat",
      userId: myUserId,
      userName: myName,
      text,
    };
    setMessages((prev) => [optimistic, ...prev].slice(0, LIVE_CHAT_VISIBLE_MAX));
    setInput("");

    try {
      await call.sendCustomEvent({
        type: LIVE_EVENT.CHAT,
        text,
      });
    } catch (e) {
      console.log("chat send error:", e);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      Alert.alert(
        "Message not sent",
        "Could not send your comment. Check your connection and try again.",
      );
    }
  };

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
      goToHomeScreen();
    }
  };

  return (
    <View style={styles.root}>
      <StageVideoLayout
        primary={primaryParticipant}
        onTapVideo={onTapVideo}
      />

      <LiveGuestStrip
        guests={miniParticipants}
        topOffset={insets.top + TT.guestTop}
      />

      <LiveJoinToastLayer
        toasts={joinToasts}
        topOffset={insets.top + 52}
        onDismiss={(id) =>
          setJoinToasts((prev) => prev.filter((t) => t.id !== id))
        }
      />

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

      <LiveTopBar
        hostName={primaryParticipant?.name || "Broadcaster"}
        streamTitle={(custom as { title?: string })?.title}
        viewerCount={viewerCount}
        isHost={isHost}
        topInset={insets.top}
        showFollow={showFollowBtn}
        isFollowing={isFollowingHost}
        followLoading={followBusy}
        onFollow={onFollowHost}
        onClose={isHost ? endLiveHost : goToHomeScreen}
        onShare={shareLive}
      />

      {/* HOST — viewers & speak requests */}
      {canModerate && !keyboardOpen && (
        <View style={[styles.hostPanel, { top: insets.top + 56 }]}>
          {speakRequests.length > 0 && (
            <View style={styles.speakRequestBanner}>
              <Text style={styles.speakRequestTitle}>
                {speakRequests[0].userName} wants to speak
              </Text>
              <View style={styles.speakRequestActions}>
                <Pressable
                  style={styles.speakAcceptBtn}
                  onPress={() =>
                    inviteToSpeak(
                      speakRequests[0].userId,
                      speakRequests[0].userName,
                    )
                  }
                >
                  <Text style={styles.speakAcceptText}>Invite</Text>
                </Pressable>
                <Pressable
                  style={styles.speakDenyBtn}
                  onPress={() =>
                    denySpeakRequest(
                      speakRequests[0].userId,
                      speakRequests[0].userName,
                    )
                  }
                >
                  <Text style={styles.speakDenyText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            style={styles.guestsToggle}
            onPress={() => setShowGuests((v) => !v)}
          >
            <Ionicons name="people" size={16} color="#fff" />
            <Text style={styles.guestsToggleText}>
              {guestViewers.length} watching · {onStage.length} on stage
            </Text>
            <Ionicons
              name={showGuests ? "chevron-up" : "chevron-down"}
              size={16}
              color="#fff"
            />
          </Pressable>

          {showGuests && (
            <View style={styles.guestsList}>
              {guestViewers.length === 0 ? (
                <Text style={styles.guestsEmpty}>No viewers yet</Text>
              ) : (
                guestViewers.map((p) => (
                  <View key={p.sessionId} style={styles.guestRow}>
                    <PresenceAvatar userId={p.userId} size={32}>
                      <View style={styles.guestAvatar}>
                        <Text style={styles.guestInitial}>
                          {(p.name || "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </PresenceAvatar>
                    <Text style={styles.guestName} numberOfLines={1}>
                      {p.name || "Viewer"}
                    </Text>
                    <Pressable
                      style={styles.inviteBtn}
                      onPress={() =>
                        inviteToSpeak(p.userId, p.name || "Viewer")
                      }
                    >
                      <Text style={styles.inviteBtnText}>Invite</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      )}

      <LiveActionRail
        hidden={keyboardOpen}
        likeCount={likeCount}
        onGift={() => setShowGiftPicker(true)}
        onHeart={() => emitReaction("❤️")}
        onEmoji={emitReaction}
      />

      {variant === "market" && !keyboardOpen && hostClerkId ? (
        <>
          {pinnedProduct ? (
            <LiveProductOverlay
              product={pinnedProduct}
              bottomOffset={dockBottom + 136}
              isHost={isHost}
              onPinPress={() => setPinSheetVisible(true)}
            />
          ) : null}
          <MarketLiveProductRail
            hostUserId={hostClerkId}
            featuredProductId={pinnedProduct?.productId}
            bottomOffset={dockBottom + (pinnedProduct ? 286 : 136)}
          />
        </>
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
          <LiveChatPanel messages={messages} maxHeight={chatMaxHeight} />

          <View style={styles.inputRow}>
            <TextInput
              placeholder="Add comment..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={input}
              onChangeText={setInput}
              style={styles.input}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={sendMessage}
            />
            {input.trim().length > 0 ? (
              <Pressable onPress={sendMessage} style={styles.sendBtn}>
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

          {!keyboardOpen && isHost && (
            <View style={styles.ttHostBarInline}>
              <TikTokIconBtn
                icon={mic?.isMute ? "mic-off" : "mic"}
                onPress={() => call?.microphone.toggle()}
              />
              <TikTokIconBtn
                icon={cam?.isEnabled ? "videocam" : "videocam-off"}
                onPress={() => call?.camera.toggle()}
              />
              <TikTokIconBtn icon="sync" onPress={() => call?.camera.flip()} />
              <TikTokIconBtn icon="pricetag" onPress={() => setPinSheetVisible(true)} />
              <TikTokIconBtn icon="call" danger onPress={endLiveHost} />
            </View>
          )}

          {!keyboardOpen && !isHost && (
            <View style={styles.ttViewerBarInline}>
              {localParticipant && !isPublishingVideo(localParticipant) && (
                <Pressable style={styles.ttViewerPill} onPress={requestToSpeak}>
                  <Ionicons name="hand-right" size={16} color="#fff" />
                  <Text style={styles.ttViewerPillText}>Request</Text>
                </Pressable>
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
        onClose={() => setShowGiftPicker(false)}
        pay={handleMpesaPay}
      />
      {variant === "market" && hostClerkId ? (
        <LivePinProductSheet
          visible={pinSheetVisible}
          hostUserId={hostClerkId}
          pinnedProductId={pinnedProduct?.productId}
          onClose={() => setPinSheetVisible(false)}
          onPin={(product) => {
            setPinnedProduct(product);
            setPinSheetVisible(false);
          }}
          onUnpin={() => {
            setPinnedProduct(null);
            setPinSheetVisible(false);
          }}
        />
      ) : null}
    </View>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function StageVideoLayout({
  primary,
  onTapVideo,
}: {
  primary?: StreamVideoParticipant;
  onTapVideo: () => void;
}) {
  const trackKey = primary
    ? `${primary.sessionId}-${primary.publishedTracks?.join(",") ?? ""}`
    : "none";

  return (
    <Pressable style={styles.videoTouch} onPress={onTapVideo}>
      {primary ? (
        <View style={styles.video} key={trackKey}>
          <VideoRenderer
            participant={primary}
            trackType="videoTrack"
            isVisible
          />
        </View>
      ) : (
        <View
          style={[
            styles.video,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: "#fff" }}>Waiting for livestream...</Text>
        </View>
      )}
    </Pressable>
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
  }, []);

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
  videoTouch: { flex: 1 },
  video: { flex: 1 },
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
