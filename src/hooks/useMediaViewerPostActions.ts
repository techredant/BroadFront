import { useCallback, useMemo } from "react";
import axios from "axios";
import { API_PUBLIC_URL } from "@/constants/api";
import { useLevel } from "@/context/LevelContext";
import type { MediaViewerEngagement } from "@/components/posts/MediaViewModal";

type PostLike = {
  _id?: string;
  id?: string;
  likes?: string[];
  likesCount?: number;
  commentsCount?: number;
  commentCount?: number;
  quoteCount?: number;
  reciteCount?: number;
  recastCount?: number;
  views?: number;
  userId?: string;
  user?: { clerkId?: string };
  [key: string]: unknown;
};

function isTempPostId(postId: unknown) {
  return typeof postId === "string" && postId.startsWith("temp-");
}

export function useMediaViewerPostActions(
  post: PostLike | undefined,
  options?: {
    onAfterLike?: () => void;
  },
): MediaViewerEngagement {
  const { userDetails, updatePost } = useLevel();
  const clerkId = userDetails?.clerkId;

  const postId = String(post?._id ?? post?.id ?? "");

  const isLiked = useMemo(
    () =>
      Boolean(
        clerkId &&
          Array.isArray(post?.likes) &&
          post.likes.includes(clerkId),
      ),
    [clerkId, post?.likes],
  );

  const likesCount = useMemo(() => {
    if (Array.isArray(post?.likes)) return post.likes.length;
    return post?.likesCount ?? 0;
  }, [post?.likes, post?.likesCount]);

  const onLike = useCallback(async () => {
    if (!postId || !clerkId || isTempPostId(postId) || !post) return;

    const currentLikes = Array.isArray(post.likes) ? [...post.likes] : [];
    const alreadyLiked = currentLikes.includes(clerkId);
    const updatedLikes = alreadyLiked
      ? currentLikes.filter((id) => id !== clerkId)
      : [...currentLikes, clerkId];
    const updatedPost = { ...post, likes: updatedLikes };

    updatePost(updatedPost);
    options?.onAfterLike?.();

    try {
      await axios.post(`${API_PUBLIC_URL}/api/posts/${postId}/like`, {
        userId: clerkId,
      });
    } catch (err) {
      console.error("Media viewer like failed:", err);
      updatePost(post);
    }
  }, [clerkId, options, post, postId, updatePost]);

  return {
    commentsCount: post?.commentsCount ?? post?.commentCount,
    quoteCount: post?.quoteCount ?? post?.reciteCount,
    recastCount: post?.recastCount,
    likesCount,
    views: post?.views,
    isLiked,
    onLike,
  };
}
