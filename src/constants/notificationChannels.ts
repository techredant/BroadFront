/** Android notification channel ids — must match backend FCM channelId mapping. */
export const NOTIFEE_CHANNELS = {
  messages: "chat_messages",
  calls: "incoming_calls",
  followers: "followers",
  livestreams: "livestreams",
  missedCalls: "missed_calls",
  marketplace: "marketplace",
  system: "system_alerts",
  default: "new_cast",
} as const;

export type NotifeeChannelId =
  (typeof NOTIFEE_CHANNELS)[keyof typeof NOTIFEE_CHANNELS];
