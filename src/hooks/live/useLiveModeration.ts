import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { OwnCapability, useCall, useCallStateHooks } from "@/rtc";
import { LIVE_EVENT } from "@/utils/livestreamSession";

type Options = {
  isHost: boolean;
  hostUserId?: string;
  myUserId?: string;
};

export function useLiveModeration({ isHost, hostUserId, myUserId }: Options) {
  const call = useCall();
  const { useHasPermissions } = useCallStateHooks();
  const [mutingIds, setMutingIds] = useState<Set<string>>(new Set());

  const canModerate =
    isHost ||
    useHasPermissions(OwnCapability.UPDATE_CALL_PERMISSIONS) ||
    useHasPermissions(OwnCapability.MUTE_USERS);

  const withMuting = useCallback(
    async (userId: string, fn: () => Promise<void>) => {
      setMutingIds((prev) => new Set(prev).add(userId));
      try {
        await fn();
      } finally {
        setMutingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [],
  );

  const muteParticipant = useCallback(
    async (userId: string, _displayName: string) => {
      if (!call || !canModerate || userId === hostUserId) return;
      await withMuting(userId, async () => {
        await call.muteUser(userId, "audio");
        await call.sendCustomEvent({
          type: LIVE_EVENT.GUEST_MUTED,
          targetUserId: userId,
        });
        await call.revokePermissions(userId, [OwnCapability.SEND_AUDIO]);
      });
    },
    [call, canModerate, hostUserId, withMuting],
  );

  const unmuteParticipant = useCallback(
    async (userId: string) => {
      if (!call || !canModerate || userId === hostUserId) return;
      await withMuting(userId, async () => {
        await call.unmuteUser(userId, "audio");
        await call.sendCustomEvent({
          type: LIVE_EVENT.GUEST_UNMUTED,
          targetUserId: userId,
        });
        await call.grantPermissions(userId, [OwnCapability.SEND_AUDIO]);
      });
    },
    [call, canModerate, hostUserId, withMuting],
  );

  const removeFromLive = useCallback(
    async (userId: string, _displayName: string) => {
      if (!call || !canModerate || userId === hostUserId) return;
      await withMuting(userId, async () => {
        await call.muteUser(userId, "audio");
        await call.revokePermissions(userId, [
          OwnCapability.SEND_AUDIO,
          OwnCapability.SEND_VIDEO,
        ]);
        await call.sendCustomEvent({
          type: LIVE_EVENT.SPEAK_DENIED,
          targetUserId: userId,
        });
        await call.sendCustomEvent({
          type: LIVE_EVENT.GUEST_MUTED,
          targetUserId: userId,
        });
      });
    },
    [call, canModerate, hostUserId, withMuting],
  );

  const muteEveryone = useCallback(
    async (guestUserIds: string[]) => {
      if (!call || !canModerate) return;
      for (const userId of guestUserIds) {
        if (!userId || userId === hostUserId) continue;
        await call.muteUser(userId, "audio");
        await call.sendCustomEvent({
          type: LIVE_EVENT.GUEST_MUTED,
          targetUserId: userId,
        });
      }
    },
    [call, canModerate, hostUserId],
  );

  const handleMuteAllEvent = useCallback(async () => {
    if (!call || isHost || myUserId === hostUserId) return;
    try {
      await call.microphone.disable();
    } catch {
      /* ignore */
    }
  }, [call, hostUserId, isHost, myUserId]);

  return {
    canModerate,
    mutingIds,
    muteParticipant,
    unmuteParticipant,
    removeFromLive,
    muteEveryone,
    handleMuteAllEvent,
  };
}
