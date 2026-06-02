/** WhatsApp-style story timing — keep web + mobile in sync */
export const STORY_IMAGE_DURATION_MS = 5000;
export const STORY_TEXT_DURATION_MS = 5000;
export const STORY_VIDEO_MIN_MS = 3000;
export const STORY_VIDEO_MAX_MS = 60_000;
/** Video only: start timer while buffering (images start immediately). */
export const STORY_MEDIA_READY_MS = 80;
export const STORY_MEDIA_FALLBACK_MS = 8000;

export function storyDurationFromVideoSeconds(seconds: number): number {
  return Math.min(
    Math.max(seconds * 1000, STORY_VIDEO_MIN_MS),
    STORY_VIDEO_MAX_MS,
  );
}
