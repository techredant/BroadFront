type ShareType = "recast" | "recite";

/** Normalize Mongo/API ids for React list keys and deduping */
export function normalizePostId(post: any) {
  if (!post) return post;
  return { ...post, _id: String(post._id) };
}

/** Optimistic post for instant feed prepend (new cast from composer) */
export function buildOptimisticNewPost({
  tempId,
  userDetails,
  clerkUser,
  caption,
  media,
  linkPreview,
  levelType,
  levelValue,
  type = "post",
  originalPostId,
  mentions = [],
}: {
  tempId: string;
  userDetails: any;
  clerkUser: any;
  caption: string;
  media: string[];
  linkPreview: any[];
  levelType: string;
  levelValue: string;
  type?: string;
  originalPostId?: string | null;
  mentions?: { userId: string; nickName: string }[];
}) {
  const now = new Date().toISOString();
  const u = userDetails || {};

  return {
    _id: tempId,
    userId: u.clerkId || clerkUser?.id,
    user: {
      clerkId: u.clerkId || clerkUser?.id,
      firstName: u.firstName || clerkUser?.firstName || "",
      lastName: u.lastName || clerkUser?.lastName || "",
      nickName: u.nickName || "",
      companyName: u.companyName || "",
      image: u.image || clerkUser?.imageUrl || "",
      accountType: u.accountType || "",
      isVerified: !!u.isVerified,
      verificationType: u.verificationType || "",
    },
    type,
    caption,
    mentions,
    quote: null,
    media: media || [],
    linkPreview: linkPreview || [],
    levelType,
    levelValue,
    originalPostId: originalPostId || null,
    likes: [],
    views: 0,
    recastCount: 0,
    reciteCount: 0,
    commentsCount: 0,
    createdAt: now,
  };
}

/** Optimistic post for instant feed prepend (recast / recite) */
export function buildOptimisticSharePost({
  type,
  tempId,
  userDetails,
  sourcePost,
  quote,
}: {
  type: ShareType;
  tempId: string;
  userDetails: any;
  sourcePost: any;
  quote?: string | null;
}) {
  const sourceUser = sourcePost.user || {};
  const now = new Date().toISOString();

  return {
    _id: tempId,
    userId: userDetails.clerkId,
    user: {
      clerkId: userDetails.clerkId,
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      nickName: userDetails.nickName,
      companyName: userDetails.companyName,
      image: userDetails.image,
      accountType: userDetails.accountType,
      isVerified: !!userDetails.isVerified,
      verificationType: userDetails.verificationType || "",
    },
    type,
    caption: sourcePost.caption || "",
    quote: quote ?? null,
    media: sourcePost.media || [],
    reciteMedia: sourcePost.media || [],
    linkPreview: sourcePost.linkPreview || [],
    levelType: sourcePost.levelType,
    levelValue: sourcePost.levelValue,
    originalPostId: sourcePost._id,
    reciteUserId: sourceUser.clerkId || sourcePost.userId,
    reciteFirstName: sourceUser.firstName || sourceUser.companyName || "",
    reciteLastName: sourceUser.lastName || "",
    reciteNickName: sourceUser.nickName || "",
    reciteImage: sourceUser.image || "",
    reciteCompanyName: sourceUser.companyName || "",
    likes: [],
    views: 0,
    recastCount: 0,
    reciteCount: 0,
    commentsCount: 0,
    createdAt: now,
  };
}

/** Merge optimistic or server post into a local posts array (profile, trends, etc.) */
export function upsertPostInList(prev: any[], post: any) {
  if (String(post._id).startsWith("temp-")) {
    if (prev.some((p) => p._id === post._id)) return prev;
    return [post, ...prev];
  }

  const filtered = prev.filter(
    (p) =>
      !(
        String(p._id).startsWith("temp-") &&
        p.type === post.type &&
        String(p.originalPostId) === String(post.originalPostId) &&
        p.userId === post.userId
      ),
  );

  if (filtered.some((p) => p._id === post._id)) {
    return filtered.map((p) => (p._id === post._id ? post : p));
  }

  return [post, ...filtered];
}
