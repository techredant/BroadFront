/** Root cast id — never a recast/recite wrapper row. */
export function getRecastOriginalPostId(post: any): string {
  if (!post?._id) return "";
  if (
    (post.type === "recast" || post.type === "recite") &&
    post.originalPostId
  ) {
    return String(post.originalPostId);
  }
  return String(post._id);
}

/** Snapshot used when creating a recast from any feed card. */
export function getRecastSourceFromPost(post: any) {
  const originalPostId = getRecastOriginalPostId(post);
  const isWrapper =
    (post?.type === "recast" || post?.type === "recite") && post?.originalPostId;

  if (isWrapper) {
    return {
      originalPostId,
      caption: post.caption || "",
      levelType: post.levelType,
      levelValue: post.levelValue,
      media: post.media || [],
      reciteUserId: post.reciteUserId || "",
      reciteFirstName: post.reciteFirstName || post.reciteCompanyName || "",
      reciteLastName: post.reciteLastName || "",
      reciteNickName: post.reciteNickName || "",
      reciteImage: post.reciteImage || "",
    };
  }

  const sourceUser = post?.user || {};
  return {
    originalPostId,
    caption: post?.caption || "",
    levelType: post?.levelType,
    levelValue: post?.levelValue,
    media: post?.media || [],
    reciteUserId: sourceUser.clerkId || post?.userId || "",
    reciteFirstName: sourceUser.firstName || sourceUser.companyName || "",
    reciteLastName: sourceUser.lastName || "",
    reciteNickName: sourceUser.nickName || "",
    reciteImage: sourceUser.image || "",
  };
}
