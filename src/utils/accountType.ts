export const PERSONAL_ACCOUNT = "Personal Account";

export function isNonPersonalAccount(accountType?: string | null): boolean {
  return Boolean(accountType && accountType !== PERSONAL_ACCOUNT);
}

export function getPostAuthorClerkId(post: {
  userId?: string;
  user?: { clerkId?: string };
}): string {
  return post.userId || post.user?.clerkId || "";
}

export function getPostAuthorAccountType(post: {
  accountType?: string;
  user?: { accountType?: string };
}): string {
  return post.user?.accountType || post.accountType || "";
}

/** News tab: followed orgs, government, media, etc. — not personal accounts. */
export function isFollowedNewsPost(
  post: {
    userId?: string;
    user?: { clerkId?: string; accountType?: string };
    accountType?: string;
  },
  followingIds: Set<string>,
): boolean {
  const authorId = getPostAuthorClerkId(post);
  const accountType = getPostAuthorAccountType(post);
  if (!authorId || !isNonPersonalAccount(accountType)) return false;
  if (followingIds.size === 0) return false;
  return followingIds.has(authorId);
}
