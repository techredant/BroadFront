import { API_PUBLIC_URL } from "@/constants/api";

export type StreamChatTarget = {
  clerkId: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  nickName?: string;
  image?: string | null;
};

export function buildStreamDisplayName(target: StreamChatTarget): string {
  const fullName = `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim();
  if (fullName) return fullName;
  if (target.companyName?.trim()) return target.companyName.trim();
  if (target.nickName?.trim()) return target.nickName.trim();
  return "Member";
}

export type ChatMemberProfile = {
  clerkId: string;
  name: string;
  image?: string | null;
};

export function looksLikeClerkId(value?: string | null): boolean {
  return !!value && /^user_[a-zA-Z0-9]+$/.test(value);
}

/** Prefer DB profile; never show raw clerk ids in the UI. */
export function resolveChatDisplayName(
  userId: string | undefined,
  streamName: string | undefined,
  profile?: ChatMemberProfile | null,
): string {
  if (userId === "ai-assistant") return "AI Assistant";
  if (profile?.name?.trim()) return profile.name.trim();
  const name = streamName?.trim();
  if (name && name !== userId && !looksLikeClerkId(name)) return name;
  return "Member";
}

export async function syncChatMemberProfiles(
  ids: string[],
): Promise<ChatMemberProfile[]> {
  const unique = [...new Set(ids.filter(Boolean))].filter(
    (id) => id !== "ai-assistant",
  );
  if (unique.length === 0) return [];

  const res = await fetch(`${API_PUBLIC_URL}/api/stream/sync-profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: unique }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to load chat profiles");
  }

  const data = (await res.json()) as { profiles?: ChatMemberProfile[] };
  return data.profiles ?? [];
}

/** Registers name + avatar on Stream so DMs show the right person (not raw clerk id). */
export async function upsertStreamUser(params: {
  userId: string;
  name: string;
  image?: string | null;
}): Promise<void> {
  const res = await fetch(`${API_PUBLIC_URL}/api/stream/upsert-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: params.userId,
      name: params.name,
      image: params.image || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to sync chat profile");
  }
}
