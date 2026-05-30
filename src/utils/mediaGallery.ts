import { formatNickHandle } from "@/utils/nickName";
import { getMediaKind, type MediaKind } from "@/utils/mediaUtils";

export type MediaGalleryItem = {
  id: string;
  uri: string;
  postId: string;
  nickname: string;
  kind: MediaKind;
  mediaIndex: number;
  postCreatedAt?: string;
};

type MediaPost = {
  _id: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  media?: string[];
  user?: { clerkId?: string; nickName?: string; nickname?: string };
};

function postNickname(post: MediaPost): string {
  const nick = post.user?.nickName ?? post.user?.nickname;
  return formatNickHandle(nick) || "@Anonymous";
}

function postPersonId(post: MediaPost): string {
  return post.userId ?? post.user?.clerkId ?? postNickname(post);
}

function postTimestamp(post: { createdAt?: string; updatedAt?: string }): number {
  const raw = post.createdAt ?? post.updatedAt;
  const parsed = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function dedupeMediaPostsById<T extends { _id?: string }>(posts: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const post of posts) {
    const id = String(post?._id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(post);
  }
  return result;
}

/** Newest posts first — matches feed ordering. */
export function sortMediaPostsNewestFirst<
  T extends { _id?: string; createdAt?: string; updatedAt?: string },
>(posts: T[]): T[] {
  return dedupeMediaPostsById(posts).sort((a, b) => {
    const diff = postTimestamp(b) - postTimestamp(a);
    if (diff !== 0) return diff;
    return String(b._id ?? "").localeCompare(String(a._id ?? ""));
  });
}

/** Merge a refreshed first page; replace the top window so deletes drop out. */
export function mergeMediaPosts<T extends { _id?: string; createdAt?: string; updatedAt?: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  if (incoming.length === 0) {
    return existing;
  }

  const incomingIds = new Set(incoming.map((post) => String(post._id ?? "")));
  const tail = existing
    .slice(incoming.length)
    .filter((post) => !incomingIds.has(String(post._id ?? "")));

  return sortMediaPostsNewestFirst([...incoming, ...tail]);
}

export function flattenPostsToMediaItems(posts: MediaPost[]): MediaGalleryItem[] {
  const items: MediaGalleryItem[] = [];

  for (const post of posts) {
    const media = post.media ?? [];
    if (!media.length) continue;

    const nickname = postNickname(post);
    media.forEach((uri, index) => {
      items.push({
        id: `${post._id}-${index}`,
        uri,
        postId: post._id,
        nickname,
        kind: getMediaKind(uri),
        mediaIndex: index,
        postCreatedAt: post.createdAt ?? post.updatedAt,
      });
    });
  }

  return items;
}

export function splitMediaGalleryItems(items: MediaGalleryItem[]) {
  return {
    videos: items.filter((item) => item.kind === "video"),
    audios: items.filter((item) => item.kind === "audio"),
    images: items.filter((item) => item.kind === "image"),
  };
}

export type MediaGalleryGroup = {
  groupId: string;
  nickname: string;
  items: MediaGalleryItem[];
};

/** @deprecated Use MediaGalleryGroup */
export type MediaGalleryPostGroup = MediaGalleryGroup;

function sortItemsNewestFirst(items: MediaGalleryItem[]): MediaGalleryItem[] {
  return [...items].sort((a, b) => {
    const ta = a.postCreatedAt ? new Date(a.postCreatedAt).getTime() : 0;
    const tb = b.postCreatedAt ? new Date(b.postCreatedAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return b.mediaIndex - a.mediaIndex;
  });
}

/** Group tab-filtered media by post, newest posts first. */
export function groupMediaItemsByPost(
  posts: MediaPost[],
  kind: MediaKind,
): MediaGalleryGroup[] {
  const groups: MediaGalleryGroup[] = [];

  for (const post of sortMediaPostsNewestFirst(posts)) {
    const media = post.media ?? [];
    if (!media.length) continue;

    const nickname = postNickname(post);
    const items: MediaGalleryItem[] = [];

    media.forEach((uri, index) => {
      const itemKind = getMediaKind(uri);
      if (itemKind !== kind) return;
      items.push({
        id: `${post._id}-${index}`,
        uri,
        postId: post._id,
        nickname,
        kind: itemKind,
        mediaIndex: index,
        postCreatedAt: post.createdAt ?? post.updatedAt,
      });
    });

    if (items.length > 0) {
      groups.push({
        groupId: post._id,
        nickname,
        items: sortItemsNewestFirst(items),
      });
    }
  }

  return groups.sort((a, b) => {
    const ta = a.items[0]?.postCreatedAt
      ? new Date(a.items[0].postCreatedAt).getTime()
      : 0;
    const tb = b.items[0]?.postCreatedAt
      ? new Date(b.items[0].postCreatedAt).getTime()
      : 0;
    if (tb !== ta) return tb - ta;
    return String(b.groupId).localeCompare(String(a.groupId));
  });
}

/** Group tab-filtered media by person, newest items first within each group. */
export function groupMediaItemsByPerson(
  posts: MediaPost[],
  kind: MediaKind,
): MediaGalleryGroup[] {
  const map = new Map<
    string,
    { nickname: string; items: MediaGalleryItem[]; latestAt: number }
  >();

  for (const post of posts) {
    const media = post.media ?? [];
    if (!media.length) continue;

    const groupId = postPersonId(post);
    const nickname = postNickname(post);
    const postTime = postTimestamp(post);

    media.forEach((uri, index) => {
      const itemKind = getMediaKind(uri);
      if (itemKind !== kind) return;

      const item: MediaGalleryItem = {
        id: `${post._id}-${index}`,
        uri,
        postId: post._id,
        nickname,
        kind: itemKind,
        mediaIndex: index,
        postCreatedAt: post.createdAt ?? post.updatedAt,
      };

      let entry = map.get(groupId);
      if (!entry) {
        entry = { nickname, items: [], latestAt: 0 };
        map.set(groupId, entry);
      }
      entry.items.push(item);
      entry.latestAt = Math.max(entry.latestAt, postTime);
    });
  }

  return [...map.entries()]
    .map(([groupId, { nickname, items, latestAt }]) => ({
      groupId,
      nickname,
      items: sortItemsNewestFirst(items),
      latestAt,
    }))
    .sort((a, b) => b.latestAt - a.latestAt)
    .map(({ groupId, nickname, items }) => ({ groupId, nickname, items }));
}

export function countMediaItemsInGroups(groups: MediaGalleryGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}
