import { useEffect, useMemo } from "react";
import { queryPresenceUserIds } from "@/utils/presenceSocket";

const SYNC_MS = 30_000;

type PostLike = {
  userId?: string;
  user?: { clerkId?: string };
};

export function authorIdsFromPosts(posts: PostLike[]) {
  const ids = new Set<string>();
  for (const post of posts) {
    const id = post.user?.clerkId ?? post.userId;
    if (id) ids.add(String(id));
  }
  return [...ids];
}

export function useFeedPresenceSync(posts: PostLike[]) {
  const authorIds = useMemo(() => authorIdsFromPosts(posts), [posts]);

  useEffect(() => {
    if (authorIds.length === 0) return;

    queryPresenceUserIds(authorIds);
    const timer = setInterval(() => queryPresenceUserIds(authorIds), SYNC_MS);
    return () => clearInterval(timer);
  }, [authorIds]);
}
