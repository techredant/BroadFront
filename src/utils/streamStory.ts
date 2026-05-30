import type { LocalMessage } from "stream-chat";

export type StoryReplyMeta = {
  statusUserId: string;
  statusId?: string;
  storyCaption?: string;
  storyMediaUrl?: string;
};

export function resolveStoryReplyMeta(
  message?: LocalMessage | null,
): StoryReplyMeta | null {
  if (!message) return null;

  const custom = message.custom as
    | {
        storyReply?: boolean;
        statusUserId?: string;
        statusId?: string;
        storyCaption?: string;
        storyMediaUrl?: string;
      }
    | undefined;

  const statusUserId = custom?.statusUserId?.trim();
  if (!statusUserId) return null;

  if (custom?.storyReply || custom?.statusId || custom?.storyMediaUrl) {
    return {
      statusUserId,
      statusId: custom.statusId ? String(custom.statusId) : undefined,
      storyCaption: custom.storyCaption,
      storyMediaUrl: custom.storyMediaUrl,
    };
  }

  return null;
}

export function resolveStoryUserId(
  message?: LocalMessage | null,
): string | undefined {
  return resolveStoryReplyMeta(message)?.statusUserId;
}

export function viewerPathForStoryUser(userId: string) {
  return `/(status)/Viewer?user=${encodeURIComponent(userId)}` as const;
}
