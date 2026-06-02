/** Custom event payloads broadcast in a livestream call */
export const LIVE_EVENT = {
  CHAT: "live_chat",
  JOIN: "live_join_ping",
  LEAVE: "live_leave_ping",
  REACTION: "live_reaction",
  GIFT: "live_gift",
  DONATION: "live_donation",
  SPEAK_REQUEST: "speak_request",
  SPEAK_INVITE: "speak_invite",
  SPEAK_DENIED: "speak_denied",
  GUEST_ON_STAGE: "guest_on_stage",
  GUEST_OFF_STAGE: "guest_off_stage",
  GUEST_MUTED: "guest_muted",
  GUEST_UNMUTED: "guest_unmuted",
} as const;

/** Max chat rows kept in memory (newest retained) */
export const LIVE_CHAT_VISIBLE_MAX = 48;

/** Batch non-chat bursts (gifts/donations) — chat posts immediately */
export const LIVE_JOIN_BATCH_MS = 80;

export type LiveGiftDef = {
  id: string;
  emoji: string;
  label: string;
  /** KES amount for M-Pesa STK */
  amount: number;
  category: "roses" | "hearts" | "lions" | "cars" | "premium";
};

/** TikTok-style gifts — amounts in KES */
export const LIVE_GIFT_CATEGORIES: {
  id: LiveGiftDef["category"];
  label: string;
}[] = [
  { id: "roses", label: "Roses" },
  { id: "hearts", label: "Hearts" },
  { id: "lions", label: "Lions" },
  { id: "cars", label: "Cars" },
  { id: "premium", label: "Premium" },
];

export const LIVE_GIFTS: LiveGiftDef[] = [
  { id: "rose", emoji: "🌹", label: "Rose", amount: 10, category: "roses" },
  { id: "bouquet", emoji: "💐", label: "Bouquet", amount: 30, category: "roses" },
  { id: "heart", emoji: "💝", label: "Heart", amount: 20, category: "hearts" },
  { id: "hearts", emoji: "💕", label: "Hearts", amount: 50, category: "hearts" },
  { id: "star", emoji: "⭐", label: "Star", amount: 50, category: "hearts" },
  { id: "fire", emoji: "🔥", label: "Fire", amount: 100, category: "hearts" },
  { id: "lion", emoji: "🦁", label: "Lion", amount: 500, category: "lions" },
  { id: "crown", emoji: "👑", label: "Crown", amount: 800, category: "lions" },
  { id: "car", emoji: "🚗", label: "Sports Car", amount: 1200, category: "cars" },
  { id: "rocket", emoji: "🚀", label: "Rocket", amount: 200, category: "premium" },
  { id: "universe", emoji: "🌌", label: "Universe", amount: 1000, category: "premium" },
];

export const LIVE_DONATION_PRESETS = [50, 100, 500, 1000] as const;

export type LiveMessage = {
  id: string;
  kind: "chat" | "join" | "leave" | "system" | "donation" | "gift";
  userId?: string;
  userName: string;
  text: string;
  isHost?: boolean;
  giftEmoji?: string;
  createdAt: number;
};

export type SpeakRequest = {
  userId: string;
  userName: string;
};

export type DonationToast = {
  id: string;
  userName: string;
  amount: number;
};

/** Append chronologically (newest at end). Drops oldest when over cap. */
export function appendMessage(
  prev: LiveMessage[],
  msg: Omit<LiveMessage, "id" | "createdAt"> & { createdAt?: number },
  max = LIVE_CHAT_VISIBLE_MAX,
): LiveMessage[] {
  const row: LiveMessage = {
    ...msg,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: msg.createdAt ?? Date.now(),
  };
  const next = [...prev, row];
  if (next.length <= max) return next;
  return next.slice(-max);
}

/** Keep the most recent rows within the cap. */
export function pruneVisibleMessages(messages: LiveMessage[]): LiveMessage[] {
  return messages.slice(-LIVE_CHAT_VISIBLE_MAX);
}

/** Opacity for TikTok-style fade: oldest (top) → 0.28, newest (bottom) → 1 */
export function liveCommentOpacity(index: number, total: number): number {
  if (total <= 1) return 1;
  const t = index / (total - 1);
  return 0.28 + t * 0.72;
}
