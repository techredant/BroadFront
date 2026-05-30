import { useCallback, useRef, useState } from "react";
import type { Call } from "@stream-io/video-react-native-sdk";
import { apiClient } from "@/lib/api-client";
import {
  LIVE_EVENT,
  REACTION_EMOJI_TO_TYPE,
  type LiveReactionType,
} from "@/utils/livestreamSession";
import {
  shouldBurstReaction,
  spawnBurstPositions,
  type FloatingReactionItem,
} from "@/components/live/LiveReactionsOverlay";
import { TT } from "@/utils/liveTikTokLayout";

const EMIT_THROTTLE_MS = 280;
const REACTION_LIFETIME_MS = 1500;

type Options = {
  call: Call | null | undefined;
  callId: string;
  myUserId?: string;
  onBumpLikes?: (n?: number) => void;
};

export function useLiveReactions({
  call,
  callId,
  myUserId,
  onBumpLikes,
}: Options) {
  const [reactions, setReactions] = useState<FloatingReactionItem[]>([]);
  const lastEmitRef = useRef(0);
  const reactionTapTimes = useRef<number[]>([]);

  const pushReaction = useCallback(
    (emoji: string, left: number) => {
      const type = REACTION_EMOJI_TO_TYPE[emoji];
      if (type === "heart" || emoji === "❤️") {
        onBumpLikes?.(1);
      }
      const id = `${Date.now()}-${Math.random()}`;
      setReactions((prev) => [...prev, { id, emoji, left }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, REACTION_LIFETIME_MS);
    },
    [onBumpLikes],
  );

  const recordAnalytics = useCallback(
    async (reactionType: LiveReactionType) => {
      if (!callId) return;
      try {
        await apiClient.post(`/api/live/${encodeURIComponent(callId)}/reactions`, {
          reactionType,
        });
      } catch {
        /* non-blocking */
      }
    },
    [callId],
  );

  const emitReaction = useCallback(
    (emoji: string) => {
      const now = Date.now();
      if (now - lastEmitRef.current < EMIT_THROTTLE_MS) return;
      lastEmitRef.current = now;

      reactionTapTimes.current = reactionTapTimes.current.filter(
        (t) => now - t < 700,
      );
      reactionTapTimes.current.push(now);
      const burst = shouldBurstReaction(reactionTapTimes.current);
      const positions = burst
        ? spawnBurstPositions(10, TT.reactionSpawnX)
        : [TT.reactionSpawnX + (Math.random() * 40 - 20)];

      positions.forEach((left) => pushReaction(emoji, left));

      const reactionType = REACTION_EMOJI_TO_TYPE[emoji];
      if (reactionType) {
        void recordAnalytics(reactionType);
      }

      void (async () => {
        if (!call) return;
        try {
          await call.sendCustomEvent({
            type: LIVE_EVENT.REACTION,
            emoji,
            left: positions[0],
            burst,
            reactionType,
          });
        } catch (e) {
          console.log("reaction send error:", e);
        }
      })();
    },
    [call, pushReaction, recordAnalytics],
  );

  const handleRemoteReaction = useCallback(
    (payload: {
      emoji?: string;
      left?: number;
      burst?: boolean;
      senderId?: string;
    }) => {
      if (payload.senderId && payload.senderId === myUserId) return;
      const emoji = payload.emoji ?? "❤️";
      const baseLeft =
        typeof payload.left === "number"
          ? payload.left
          : TT.reactionSpawnX + Math.random() * 40 - 20;
      const positions = payload.burst
        ? spawnBurstPositions(10, baseLeft)
        : [baseLeft];
      if (emoji === "❤️") onBumpLikes?.(1);
      positions.forEach((left) => pushReaction(emoji, left));
    },
    [myUserId, onBumpLikes, pushReaction],
  );

  return {
    reactions,
    emitReaction,
    handleRemoteReaction,
  };
}
