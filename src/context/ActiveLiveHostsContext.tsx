import React, { createContext, useContext } from "react";
import { useActiveMarketLives } from "@/hooks/useActiveMarketLives";

type ActiveLiveHostsContextValue = {
  isUserLive: (userId?: string | null) => boolean;
  getUserLiveCallId: (userId?: string | null) => string | undefined;
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
  const { isUserLive, getUserLiveCallId, refresh } = useActiveMarketLives();

  return (
    <ActiveLiveHostsContext.Provider
      value={{ isUserLive, getUserLiveCallId, refresh }}
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
      refresh: () => {},
    };
  }
  return ctx;
}
