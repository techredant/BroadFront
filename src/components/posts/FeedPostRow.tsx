import React, { memo } from "react";
import { PostCard } from "./PostCard";
import { useFeedItemVisibility } from "@/hooks/useFeedItemVisibility";

type FeedPostRowProps = {
  post: any;
  allPosts?: any[];
  onDeletePost: (postId: string) => void;
  onUpdatePost: (post: any) => void;
  onPrependPost: (post: any) => void;
  onRemovePost: (postId: string) => void;
};

function FeedPostRow({
  post,
  allPosts,
  onDeletePost,
  onUpdatePost,
  onPrependPost,
  onRemovePost,
}: FeedPostRowProps) {
  const isVisible = useFeedItemVisibility(post?._id);

  return (
    <PostCard
      post={post}
      allPosts={allPosts}
      isVisible={isVisible}
      onDeletePost={onDeletePost}
      onUpdatePost={onUpdatePost}
      onPrependPost={onPrependPost}
      onRemovePost={onRemovePost}
    />
  );
}

function postRowPropsEqual(prev: FeedPostRowProps, next: FeedPostRowProps) {
  if (prev.post?._id !== next.post?._id) return false;
  if (prev.allPosts !== next.allPosts) return false;

  const p = prev.post;
  const n = next.post;
  if (!p || !n) return p === n;

  return (
    p.caption === n.caption &&
    p.__isDeleting === n.__isDeleting &&
    p.commentsCount === n.commentsCount &&
    p.recastCount === n.recastCount &&
    p.reciteCount === n.reciteCount &&
    p.views === n.views &&
    (p.likes?.length ?? 0) === (n.likes?.length ?? 0) &&
    (p.media?.length ?? 0) === (n.media?.length ?? 0)
  );
}

export const MemoizedFeedPostRow = memo(FeedPostRow, postRowPropsEqual);
