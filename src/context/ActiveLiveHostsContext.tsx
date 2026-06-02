import React, { createContext, useContext, useEffect } from "react";
import { useActiveMarketLives } from "@/hooks/useActiveMarketLives";
import { presenceStore } from "@/lib/presenceStore";

type ActiveLiveHostsContextValue = {
  isUserLive: (userId?: string | null) => boolean;
  isUserInAudio: (userId?: string | null) => boolean;
  getUserLiveCallId: (userId?: string | null) => string | undefined;
  getUserAudioCallId: (userId?: string | null) => string | undefined;
  activeLiveCallIds: Set<string>;
  activeAudioCallIds: Set<string>;
  refresh: () => void;
};

const ActiveLiveHostsContext = createContext<ActiveLiveHostsContextValue | null>(
  null,
);

export function ActiveLiveHostsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isUserLive,
    isUserInAudio,
    getUserLiveCallId,
    getUserAudioCallId,
    activeLiveCallIds,
    activeAudioCallIds,
    liveHostIds,
    audioHostIds,
    refresh,
  } = useActiveMarketLives();

  useEffect(() => {
    presenceStore.setLiveUsers(liveHostIds);
  }, [liveHostIds]);

  useEffect(() => {
    presenceStore.setAudioUsers(audioHostIds);
  }, [audioHostIds]);

  return (
    <ActiveLiveHostsContext.Provider
      value={{
        isUserLive,
        isUserInAudio,
        getUserLiveCallId,
        getUserAudioCallId,
        activeLiveCallIds,
        activeAudioCallIds,
        refresh,
      }}
    >
      {children}
    </ActiveLiveHostsContext.Provider>
  );
}

export function useActiveLiveHosts() {
  const ctx = useContext(ActiveLiveHostsContext);
  if (!ctx) {
    return {
      isUserLive: () => false,
      isUserInAudio: () => false,
      getUserLiveCallId: () => undefined,
      getUserAudioCallId: () => undefined,
      activeLiveCallIds: new Set<string>(),
      activeAudioCallIds: new Set<string>(),
      refresh: () => {},
    };
  }
  return ctx;
}
