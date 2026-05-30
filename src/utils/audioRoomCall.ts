import type { RtcCall } from "@/rtc/RtcCall";
import { OwnCapability } from "@/rtc";

/** Call-level settings so hosts can present in audio rooms. */
export const AUDIO_ROOM_SCREENSHARE_SETTINGS = {
  screensharing: {
    enabled: true,
    access_request_enabled: false,
  },
} as const;

type AudioRoomCreateData = {
  custom?: Record<string, unknown>;
  settings_override?: Record<string, unknown>;
  members?: Array<{ user_id: string; role?: string }>;
};

export function withAudioRoomScreenShareSettings(
  data?: AudioRoomCreateData,
): AudioRoomCreateData {
  return {
    ...data,
    settings_override: {
      ...data?.settings_override,
      ...AUDIO_ROOM_SCREENSHARE_SETTINGS,
    },
  };
}

export function buildAudioRoomGetOrCreateRequest(data?: AudioRoomCreateData) {
  return { data: withAudioRoomScreenShareSettings(data) };
}

/** Host/moderator: enable screensharing on the call and ensure publish permission. */
export async function ensureAudioRoomScreenShare(call: RtcCall, isHost: boolean) {
  if (!isHost) return;

  if (!call.state.settings?.screensharing?.enabled) {
    await call.update({
      custom: {
        ...call.state.custom,
        screensharingEnabled: true,
      },
    });
    call.state.settings = {
      ...call.state.settings,
      screensharing: { enabled: true },
    };
  }

  const userId = call.currentUserId;
  const caps = call.state.ownCapabilities ?? [];
  if (userId && !caps.includes(OwnCapability.SCREENSHARE)) {
    await call.grantPermissions(userId, [OwnCapability.SCREENSHARE]);
    call.state.ownCapabilities = [...caps, OwnCapability.SCREENSHARE];
  }
}
