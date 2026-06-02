import { useCallback, useSyncExternalStore } from "react";
import { presenceStore, type UserPresenceSnapshot } from "@/lib/presenceStore";

const OFFLINE_SNAPSHOT: UserPresenceSnapshot = {
  isOnline: false,
  isLive: false,
  isInAudio: false,
};

export function useUserPresence(userId?: string | null): UserPresenceSnapshot {
  const key = userId ? String(userId) : null;

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      key ? presenceStore.subscribe(key, onStoreChange) : () => {},
    [key],
  );

  const getSnapshot = useCallback(
    () => (key ? presenceStore.getSnapshot(key) : OFFLINE_SNAPSHOT),
    [key],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
