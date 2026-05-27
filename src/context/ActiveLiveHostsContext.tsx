import React, { createContext, useContext, useEffect } from "react";
import { useActiveMarketLives } from "@/hooks/useActiveMarketLives";
import { presenceStore } from "@/lib/presenceStore";

type ActiveLiveHostsContextValue = {
  isUserLive: (userId?: string | null) => boolean;
  getUserLiveCallId: (userId?: string | null) => string | undefined;
  activeLiveCallIds: Set<string>;
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
  const { isUserLive, getUserLiveCallId, activeLiveCallIds, liveHostIds, refresh } =
    useActiveMarketLives();

  useEffect(() => {
    presenceStore.setLiveUsers(liveHostIds);
  }, [liveHostIds]);

  return (
    <ActiveLiveHostsContext.Provider
      value={{ isUserLive, getUserLiveCallId, activeLiveCallIds, refresh }}
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
      getUserLiveCallId: () => undefined,
      activeLiveCallIds: new Set<string>(),
      refresh: () => {},
    };
  }
  return ctx;
}
