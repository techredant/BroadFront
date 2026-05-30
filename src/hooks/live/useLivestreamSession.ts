import { useEffect, useMemo, useRef, useState } from "react";
import type { AgoraRtcClient, RtcCall } from "@/rtc/RtcCall";
import { startLiveSession } from "@/rtc/agoraApi";
import {
  configureLivestreamViewerMedia,
  joinLivestreamAsHost,
  stopCallMedia,
} from "@/utils/callMedia";
import { configureCallDefaults } from "@/utils/streamCallLifecycle";
import { notifyLiveStarted } from "@/utils/notifyLiveStarted";
import {
  buildMarketLiveCustom,
  type MarketLiveProduct,
} from "@/utils/marketLive";
import {
  clearActiveCommunityLiveSession,
  setActiveCommunityLiveSession,
} from "@/utils/communityLiveSession";

type UseLivestreamSessionOptions = {
  client: AgoraRtcClient | null | undefined;
  callId: string;
  isHost: boolean;
  variant?: "community" | "market";
  roomTitle?: string;
  level?: string;
  hostClerkId?: string;
  initialMarketProduct?: MarketLiveProduct | null;
  onEnded?: () => void;
  onHostEnded?: () => void;
};

/** Host/viewer join + leave lifecycle for livestream calls. */
export function useLivestreamSession({
  client,
  callId,
  isHost,
  variant = "community",
  roomTitle,
  level,
  hostClerkId,
  initialMarketProduct,
  onEnded,
  onHostEnded,
}: UseLivestreamSessionOptions) {
  const [call, setCall] = useState<RtcCall | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinGenRef = useRef(0);
  const liveNotifySentRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const onHostEndedRef = useRef(onHostEnded);
  onEndedRef.current = onEnded;
  onHostEndedRef.current = onHostEnded;

  const streamCall = useMemo(() => {
    if (!client) return null;
    const instance = client.call("livestream", callId);
    configureCallDefaults(instance);
    return instance;
  }, [client, callId]);

  useEffect(() => {
    liveNotifySentRef.current = false;
  }, [callId]);

  useEffect(() => {
    if (!streamCall) return;

    const gen = ++joinGenRef.current;
    let active = true;

    const run = async () => {
      try {
        setJoinError(null);

        const customData =
          variant === "market"
            ? buildMarketLiveCustom({
                hostClerkId: hostClerkId || "",
                roomTitle,
                level,
                product: initialMarketProduct,
              })
            : {
                title: roomTitle ?? "Live",
                level: level ?? "home",
              };

        await streamCall.get().catch(() => {});

        const isCreatorRejoin =
          Boolean(hostClerkId) &&
          streamCall.state.createdBy?.id === hostClerkId &&
          streamCall.state.endedAt == null;

        const joinAsHost = isHost || isCreatorRejoin;

        if (joinAsHost) {
          if (!isRejoin(streamCall, hostClerkId)) {
            try {
              await streamCall.getOrCreate({
                data: {
                  custom: customData,
                  members: hostClerkId
                    ? [{ user_id: hostClerkId, role: "host" }]
                    : [],
                },
              });
            } catch {
              await streamCall.getOrCreate({
                data: { custom: customData },
              });
            }
            if (variant === "community") {
              setActiveCommunityLiveSession({
                callId,
                isHost: true,
                roomTitle,
                level,
              });
            }
          }

          await joinLivestreamAsHost(streamCall, {
            rejoin: isRejoin(streamCall, hostClerkId),
          });

          await startLiveSession({
            callId,
            hostClerkId: hostClerkId || streamCall.currentUserId,
            variant,
            roomTitle: roomTitle ?? "Live",
            level,
            custom: customData,
          }).catch(() => {});

          if (hostClerkId && !liveNotifySentRef.current && !isCreatorRejoin) {
            liveNotifySentRef.current = true;
            void notifyLiveStarted({
              hostClerkId,
              callId,
              title: roomTitle,
              level,
            });
          }
        } else {
          await streamCall.join({ create: false, maxJoinRetries: 3, role: "audience" });
          configureLivestreamViewerMedia(streamCall);
        }

        if (!active || joinGenRef.current !== gen) {
          await streamCall.leave().catch(() => {});
          stopCallMedia();
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

    void run();

    const handleEnded = () => {
      if (!active) return;
      if (variant === "community") {
        clearActiveCommunityLiveSession();
      }
      onHostEndedRef.current?.();
      onEndedRef.current?.();
    };

    streamCall.on("call.ended", handleEnded);

    return () => {
      active = false;
      streamCall.off("call.ended", handleEnded);
      void streamCall.leave().catch(() => {});
      stopCallMedia();
      setCall(null);
    };
  }, [
    streamCall,
    callId,
    isHost,
    roomTitle,
    level,
    hostClerkId,
    variant,
    initialMarketProduct,
  ]);

  return { call, joinError };
}

function isRejoin(call: RtcCall, hostClerkId?: string): boolean {
  return (
    Boolean(hostClerkId) &&
    call.state.createdBy?.id === hostClerkId &&
    call.state.endedAt == null
  );
}

/** True when the connected user created this livestream call. */
export function isCallCreator(
  call: RtcCall | null | undefined,
  userId?: string | null,
): boolean {
  if (!call || !userId) return false;
  return call.state.createdBy?.id === userId;
}

/** Host if session says so or call creator matches current user. */
export function resolveLiveHostRole(
  isHostProp: boolean,
  call: RtcCall | null | undefined,
  userId?: string | null,
): boolean {
  if (isHostProp) return true;
  return isCallCreator(call, userId);
}
