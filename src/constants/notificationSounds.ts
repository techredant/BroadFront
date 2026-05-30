/** Bundled notification audio (must match filenames in app.json expo-notifications sounds). */
export const NOTIFICATION_SOUNDS = {
  default: "notification_sound.wav",
  other: "notification_sound_other.wav",
  incomingCall: "incoming.wav",
} as const;

/** In-app call ringtones (expo-audio), not Android notification channels. */
export const CALL_RINGTONES = {
  incoming: require("@/assets/notifications/incoming.wav"),
  outgoing: require("@/assets/notifications/outgoing.wav"),
} as const;
