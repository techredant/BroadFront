import type { Call, GetOrCreateCallRequest } from "@stream-io/video-client";
import { OwnCapability } from "@stream-io/video-react-native-sdk";

/** Call-level settings so hosts can present in audio rooms. */
export const AUDIO_ROOM_SCREENSHARE_SETTINGS = {
  screensharing: {
    enabled: true,
    access_request_enabled: false,
  },
} as const;

type AudioRoomCreateData = NonNullable<GetOrCreateCallRequest["data"]>;

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

export function buildAudioRoomGetOrCreateRequest(
  data?: AudioRoomCreateData,
): GetOrCreateCallRequest {
  return { data: withAudioRoomScreenShareSettings(data) };
}

/** Host/moderator: enable screensharing on the call and ensure publish permission. */
export async function ensureAudioRoomScreenShare(call: Call, isHost: boolean) {
  if (!isHost) return;

  if (!call.state.settings?.screensharing.enabled) {
    await call.update({
      settings_override: AUDIO_ROOM_SCREENSHARE_SETTINGS,
    });
  }

  const userId = call.currentUserId;
  const caps = call.state.ownCapabilities ?? [];
  if (userId && !caps.includes(OwnCapability.SCREENSHARE)) {
    await call.grantPermissions(userId, [OwnCapability.SCREENSHARE]);
  }
}
