/** Custom event payloads broadcast in a livestream call */
export const LIVE_EVENT = {
  CHAT: "live_chat",
  JOIN: "live_join_ping",
  REACTION: "live_reaction",
  GIFT: "live_gift",
  DONATION: "live_donation",
  SPEAK_REQUEST: "speak_request",
  SPEAK_INVITE: "speak_invite",
  SPEAK_DENIED: "speak_denied",
} as const;

/** Max chat rows rendered at once (performance) */
export const LIVE_CHAT_VISIBLE_MAX = 40;

/** Join toast visibility duration */
export const LIVE_JOIN_TOAST_MS = 4000;

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
  kind: "chat" | "join" | "system" | "donation" | "gift";
  userId?: string;
  userName: string;
  text: string;
  isHost?: boolean;
  giftEmoji?: string;
  /** Auto-hide join rows after this timestamp */
  expiresAt?: number;
};

export type SpeakRequest = {
  userId: string;
  userName: string;
};

export type JoinToast = {
  id: string;
  userName: string;
};

export type DonationToast = {
  id: string;
  userName: string;
  amount: number;
};

export function appendMessage(
  prev: LiveMessage[],
  msg: Omit<LiveMessage, "id">,
  max = LIVE_CHAT_VISIBLE_MAX,
): LiveMessage[] {
  const next = [{ ...msg, id: `${Date.now()}-${Math.random()}` }, ...prev];
  return next.slice(0, max);
}

/** Drop expired join rows and cap list length */
export function pruneVisibleMessages(messages: LiveMessage[]): LiveMessage[] {
  const now = Date.now();
  return messages
    .filter((m) => m.kind !== "join" || !m.expiresAt || m.expiresAt > now)
    .slice(0, LIVE_CHAT_VISIBLE_MAX);
}
