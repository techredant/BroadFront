export type NotificationCategory =
  | "social"
  | "messages"
  | "marketplace"
  | "livestreams"
  | "system"
  | "calls";

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "reply"
  | "mention"
  | "repost"
  | "share"
  | "story_reaction"
  | "message"
  | "group_message"
  | "media_message"
  | "voice_note"
  | "product_like"
  | "new_order"
  | "order_update"
  | "delivery_update"
  | "seller_response"
  | "livestream_started"
  | "live_join_request"
  | "live_invite"
  | "live_reaction"
  | "verification_approved"
  | "payment_successful"
  | "security_alert"
  | "incoming_call"
  | "missed_call"
  | "system";

export type NotificationActor = {
  userId?: string;
  name?: string;
  image?: string;
};

export type NotificationData = {
  url?: string;
  screen?: string;
  postId?: string;
  callId?: string;
  channelId?: string;
  authorId?: string;
  callMode?: string;
  isCaller?: string;
  type?: string;
  category?: NotificationCategory;
  entityId?: string;
  notificationId?: string;
};

export type AppNotification = {
  _id?: string;
  type?: NotificationType | string;
  category?: NotificationCategory;
  title?: string;
  body?: string;
  actor?: NotificationActor;
  entityId?: string;
  entityType?: string;
  mediaPreview?: string | null;
  groupCount?: number;
  read?: boolean;
  data?: NotificationData;
  postId?: string;
  callId?: string;
  authorId?: string;
  createdAt?: string;
};

export type NotificationSection =
  | "all"
  | "messages"
  | "social"
  | "marketplace"
  | "livestreams"
  | "system";

export type NotificationPreferences = {
  userId?: string;
  enabled: {
    social: boolean;
    messages: boolean;
    marketplace: boolean;
    livestreams: boolean;
    system: boolean;
    calls: boolean;
  };
  mutedUsers: string[];
  mutedGroups: string[];
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  sounds: Record<string, string>;
  vibration: boolean;
  showPreviews: boolean;
};

export const NOTIFICATION_SECTIONS: {
  key: NotificationSection;
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "messages", label: "Messages" },
  { key: "social", label: "Social" },
  { key: "marketplace", label: "Marketplace" },
  { key: "livestreams", label: "Live" },
  { key: "system", label: "System" },
];

export function sectionToCategory(
  section: NotificationSection,
): NotificationCategory | null {
  if (section === "all") return null;
  return section;
}

export function formatNotificationTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function notificationIcon(type?: string): string {
  switch (type) {
    case "follow":
      return "person-add";
    case "like":
    case "story_reaction":
    case "live_reaction":
    case "product_like":
      return "heart";
    case "comment":
    case "reply":
      return "chatbubble";
    case "mention":
      return "at";
    case "message":
    case "group_message":
    case "media_message":
    case "voice_note":
      return "mail";
    case "livestream_started":
    case "live_invite":
      return "radio";
    case "new_order":
    case "order_update":
    case "delivery_update":
      return "cart";
    case "incoming_call":
    case "missed_call":
      return "call";
    case "verification_approved":
      return "checkmark-circle";
    case "security_alert":
      return "shield";
    default:
      return "notifications";
  }
}
