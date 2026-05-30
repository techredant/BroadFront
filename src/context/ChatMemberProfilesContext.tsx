import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  syncChatMemberProfiles,
  type ChatMemberProfile,
} from "@/utils/streamUser";

type ChatMemberProfilesContextValue = {
  getProfile: (clerkId: string | undefined) => ChatMemberProfile | undefined;
  ensureProfiles: (ids: string[]) => Promise<void>;
};

const ChatMemberProfilesContext =
  createContext<ChatMemberProfilesContextValue | null>(null);

export function ChatMemberProfilesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const cacheRef = useRef<Map<string, ChatMemberProfile>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());
  const [, bump] = useState(0);

  const ensureProfiles = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids.filter(Boolean))].filter(
      (id) =>
        id !== "ai-assistant" &&
        !cacheRef.current.has(id) &&
        !pendingRef.current.has(id),
    );
    if (missing.length === 0) return;

    missing.forEach((id) => pendingRef.current.add(id));

    try {
      const profiles = await syncChatMemberProfiles(missing);
      for (const profile of profiles) {
        cacheRef.current.set(profile.clerkId, profile);
      }
      bump((n) => n + 1);
    } finally {
      missing.forEach((id) => pendingRef.current.delete(id));
    }
  }, []);

  const getProfile = useCallback((clerkId: string | undefined) => {
    if (!clerkId) return undefined;
    return cacheRef.current.get(clerkId);
  }, []);

  const value = useMemo(
    () => ({ getProfile, ensureProfiles }),
    [getProfile, ensureProfiles],
  );

  return (
    <ChatMemberProfilesContext.Provider value={value}>
      {children}
    </ChatMemberProfilesContext.Provider>
  );
}

export function useChatMemberProfiles() {
  const ctx = useContext(ChatMemberProfilesContext);
  if (!ctx) {
    throw new Error(
      "useChatMemberProfiles must be used inside ChatMemberProfilesProvider",
    );
  }
  return ctx;
}
