import { statusAvatarUri } from "@/utils/statusUser";

export type StatusProfileSnapshot = {
  image?: string;
  firstName?: string;
  companyName?: string;
};

export type StatusProfileLookup = {
  selfUserId?: string | null;
  selfImage?: string | null;
  posts?: Array<{
    userId?: string;
    user?: { clerkId?: string; image?: string };
  }>;
};

/** Match PostCard: prefer live feed user.image over status snapshot. */
export function pickProfileImageFromPosts(
  userId: string,
  posts?: StatusProfileLookup["posts"],
): string | undefined {
  if (!userId || !posts?.length) return undefined;

  for (const post of posts) {
    const authorId = post.user?.clerkId ?? post.userId;
    if (!authorId || String(authorId) !== String(userId)) continue;
    const img = (post.user?.image ?? "").trim();
    if (img) return img;
  }

  return undefined;
}

export function resolveStatusProfileImage(
  userId: string | undefined,
  snapshot?: StatusProfileSnapshot | null,
  lookup?: StatusProfileLookup,
): string {
  if (userId && lookup?.selfUserId && String(userId) === String(lookup.selfUserId)) {
    const self = (lookup.selfImage ?? "").trim();
    if (self) return self;
  }

  const fromPosts =
    userId && lookup?.posts
      ? pickProfileImageFromPosts(userId, lookup.posts)
      : undefined;
  if (fromPosts) return fromPosts;

  const snap = (snapshot?.image ?? "").trim();
  if (snap) return snap;

  return statusAvatarUri(null, snapshot ?? undefined);
}
