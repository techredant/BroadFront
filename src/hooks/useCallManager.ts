import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { CallingState, callManager } from "@stream-io/video-react-native-sdk";
import type { StreamChat } from "stream-chat";
import {
  buildCallMemberDisplayNames,
  displayNameFromChatUser,
  getRemoteChatMember,
} from "@/utils/callDisplayName";
import {
  messagingChannelCid,
  messagingChannelIdFromRoute,
  streamVideoCallId,
} from "@/utils/callDisplay";
import {
  buildOutgoingCallRequest,
  endStaleCallBeforeOutgoing,
  type CallMode,
} from "@/utils/callMode";
import { joinCallWithMedia } from "@/utils/callMedia";
import { upsertStreamUser } from "@/utils/streamUser";
import { isUserBusyInAnotherCall, rejectRingingCall } from "@/utils/callBusy";
import { callDebug } from "@/utils/callDebug";

export type CallRemotePeer = {
  name: string;
  image?: string;
};

type UseCallManagerOptions = {
  videoClient: StreamVideoClient | null | undefined;
  chatClient: StreamChat | null | undefined;
  rawCallId: string;
  isCaller: boolean;
  urlCallMode: CallMode;
  userId: string | null | undefined;
};

export function useCallManager({
  videoClient,
  chatClient,
  rawCallId,
  isCaller,
  urlCallMode,
  userId,
}: UseCallManagerOptions) {
  const channelId = rawCallId ? messagingChannelIdFromRoute(rawCallId) : "";
  const videoCallId = channelId ? streamVideoCallId(channelId) : "";

  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectiveCallMode, setEffectiveCallMode] =
    useState<CallMode>(urlCallMode);
  const [remotePeer, setRemotePeer] = useState<CallRemotePeer>({ name: "User" });
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const callRef = useRef<Call | null>(null);
  callRef.current = call;
  const chatUserId = chatClient?.userID;
  const acceptHandledRef = useRef(false);
  const setupGenerationRef = useRef(0);

  useEffect(() => {
    if (!videoClient || !videoCallId || !channelId || !chatUserId || !userId) {
      return;
    }

    const generation = ++setupGenerationRef.current;
    let cancelled = false;
    acceptHandledRef.current = false;

    const setup = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isCaller && isUserBusyInAnotherCall(videoClient, videoCallId)) {
          if (!cancelled) {
            setError("You are already in another call.");
          }
          return;
        }

        if (!isCaller && isUserBusyInAnotherCall(videoClient, videoCallId)) {
          await rejectRingingCall(videoClient, videoCallId, "busy");
          if (!cancelled) {
            setError("You are already in another call.");
          }
          return;
        }

        const channel = chatClient.channel("messaging", channelId);
        await channel.watch();

        const myId = chatUserId;
        const nameMap = buildCallMemberDisplayNames(channel, myId);
        const remote = getRemoteChatMember(channel, myId);

        if (!cancelled) {
          setDisplayNames(nameMap);
          setRemotePeer({
            name: displayNameFromChatUser(remote?.user),
            image: remote?.user?.image,
          });
        }

        await Promise.all(
          Object.entries(nameMap).map(([uid, name]) =>
            uid === myId
              ? Promise.resolve()
              : upsertStreamUser({
                  userId: uid,
                  name,
                  image: channel.state.members[uid]?.user?.image,
                }).catch(() => {}),
          ),
        );

        if (isCaller) {
          await endStaleCallBeforeOutgoing(videoClient, videoCallId);
        }

        let streamCall = videoClient.call("default", videoCallId, {
          reuseInstance: !isCaller,
        });

        if (!isCaller && !streamCall.ringing) {
          await new Promise((r) => setTimeout(r, 400));
          streamCall = videoClient.call("default", videoCallId, {
            reuseInstance: true,
          });
        }

        const isVideoCall = urlCallMode === "video";

        if (isCaller) {
          const memberIds = new Set<string>([myId]);
          Object.values(channel.state.members).forEach((m) => {
            if (m.user_id) memberIds.add(m.user_id);
          });

          await streamCall.getOrCreate(
            buildOutgoingCallRequest(
              isVideoCall,
              myId,
              Array.from(memberIds),
              messagingChannelCid(channelId),
            ),
          );
        } else {
          if (!streamCall.ringing) {
            await streamCall.get({ ring: true, video: isVideoCall });
          }

          const custom = streamCall.state?.custom as
            | { callMode?: string }
            | undefined;
          if (!cancelled) {
            if (custom?.callMode === "audio") setEffectiveCallMode("audio");
            else if (custom?.callMode === "video") setEffectiveCallMode("video");
            else setEffectiveCallMode(urlCallMode);
          }
        }

        callDebug.log("setup-complete", {
          videoCallId,
          isCaller,
          mode: urlCallMode,
        });

        if (!cancelled && generation === setupGenerationRef.current) {
          setCall(streamCall);
        }
      } catch (err) {
        callDebug.error("setup-failed", err);
        if (!cancelled && generation === setupGenerationRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to start the call.",
          );
        }
      } finally {
        if (!cancelled && generation === setupGenerationRef.current) {
          setLoading(false);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, [
    videoClient,
    videoCallId,
    channelId,
    chatUserId,
    userId,
    isCaller,
    urlCallMode,
  ]);

  useEffect(() => {
    if (!call || !isCaller) return;

    const onAccepted = async (event: { user: { id?: string } }) => {
      if (event.user?.id === call.currentUserId) return;
      if (call.state.callingState === CallingState.LEFT) return;
      if (acceptHandledRef.current) return;

      acceptHandledRef.current = true;

      try {
        await joinCallWithMedia(call, effectiveCallMode === "video");
        callDebug.log("caller-joined-on-accept");
      } catch (err) {
        acceptHandledRef.current = false;
        callDebug.error("caller-join-failed", err);
      }
    };

    return call.on("call.accepted", onAccepted);
  }, [call, isCaller, effectiveCallMode]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const activeCall = callRef.current;
      if (next !== "active" || !activeCall) return;
      if (activeCall.state.callingState !== CallingState.JOINED) return;

      void joinCallWithMedia(activeCall, effectiveCallMode === "video").catch(
        (err) => callDebug.warn("resume-media-failed", err),
      );
    });

    return () => sub.remove();
  }, [effectiveCallMode]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const activeCall = callRef.current;
      if (!state.isConnected || !activeCall) return;
      if (activeCall.state.callingState !== CallingState.JOINED) return;

      void joinCallWithMedia(activeCall, effectiveCallMode === "video").catch(
        (err) => callDebug.warn("reconnect-media-failed", err),
      );
    });

    return unsub;
  }, [effectiveCallMode]);

  useEffect(() => {
    return () => {
      const activeCall = callRef.current;
      if (!activeCall) return;

      const state = activeCall.state.callingState;
      if (state === CallingState.LEFT) return;

      // Only tear down ringing calls when leaving the screen without accepting.
      if (
        state === CallingState.JOINED ||
        activeCall.ringing ||
        state === CallingState.RINGING
      ) {
        try {
          callManager.stop();
        } catch {
          /* ignore */
        }

        void (async () => {
          try {
            if (activeCall.isCreatedByMe && state !== CallingState.JOINED) {
              await activeCall.leave({ reject: true, reason: "cancel" });
            } else if (state !== CallingState.JOINED) {
              await activeCall.leave({ reject: true, reason: "decline" });
            }
          } catch {
            /* ignore */
          }
        })();
      }
    };
  }, []);

  return {
    call,
    loading,
    error,
    remotePeer,
    displayNames,
    effectiveCallMode,
    videoCallId,
    channelId,
  };
}
