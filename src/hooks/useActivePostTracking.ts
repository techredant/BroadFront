import { MutableRefObject, useCallback, useEffect, useState } from "react";
import * as Haptics from "expo-haptics";

type MediaPost = {
  _id?: string;
  id?: string;
  media?: string[];
  [key: string]: any;
};

type Config = {
  visible: boolean;
  posts: MediaPost[];
  initialPostIndex: number;
  initialMediaIndex: number;
  onPostChange?: (index: number, mediaIndex: number) => void;
  onMediaIndexChange?: (index: number) => void;
  getPostId?: (index: number) => string | undefined;
  mediaIndexByPostIdRef?: MutableRefObject<Map<string, number>>;
};

function fallbackPostId(post: MediaPost | undefined, index: number) {
  return String(post?._id ?? post?.id ?? `post-${index}`);
}

export function useActivePostTracking({
  visible,
  posts,
  initialPostIndex,
  initialMediaIndex,
  onPostChange,
  onMediaIndexChange,
  getPostId,
  mediaIndexByPostIdRef,
}: Config) {
  const [activePostIndex, setActivePostIndex] = useState(initialPostIndex);
  const [, setMediaIndexVersion] = useState(0);

  const getId = useCallback(
    (index: number) => getPostId?.(index) ?? fallbackPostId(posts[index], index),
    [getPostId, posts],
  );

  useEffect(() => {
    if (!visible) return;
    const boundedPostIndex = Math.min(
      Math.max(initialPostIndex, 0),
      Math.max(posts.length - 1, 0),
    );
    const postId = getId(boundedPostIndex);
    const maxMediaIndex = Math.max((posts[boundedPostIndex]?.media?.length ?? 1) - 1, 0);
    const boundedMediaIndex = Math.min(Math.max(initialMediaIndex, 0), maxMediaIndex);

    mediaIndexByPostIdRef?.current.set(postId, boundedMediaIndex);
    setActivePostIndex(boundedPostIndex);
    setMediaIndexVersion((version) => version + 1);
  }, [
    getId,
    initialMediaIndex,
    initialPostIndex,
    mediaIndexByPostIdRef,
    posts,
    visible,
  ]);

  const getMediaIndex = useCallback(
    (postIndex: number) => {
      const postId = getId(postIndex);
      const maxMediaIndex = Math.max((posts[postIndex]?.media?.length ?? 1) - 1, 0);
      return Math.min(
        Math.max(mediaIndexByPostIdRef?.current.get(postId) ?? 0, 0),
        maxMediaIndex,
      );
    },
    [getId, mediaIndexByPostIdRef, posts],
  );

  const setMediaIndexForPost = useCallback(
    (postIndex: number, mediaIndex: number) => {
      const postId = getId(postIndex);
      const maxMediaIndex = Math.max((posts[postIndex]?.media?.length ?? 1) - 1, 0);
      const boundedIndex = Math.min(Math.max(mediaIndex, 0), maxMediaIndex);
      mediaIndexByPostIdRef?.current.set(postId, boundedIndex);
      setMediaIndexVersion((version) => version + 1);

      if (postIndex === activePostIndex) {
        onMediaIndexChange?.(boundedIndex);
      }
    },
    [
      activePostIndex,
      getId,
      mediaIndexByPostIdRef,
      onMediaIndexChange,
      posts,
    ],
  );

  const setActivePost = useCallback(
    (postIndex: number) => {
      const boundedIndex = Math.min(Math.max(postIndex, 0), Math.max(posts.length - 1, 0));
      if (boundedIndex === activePostIndex) return;

      const restoredMediaIndex = getMediaIndex(boundedIndex);
      setActivePostIndex(boundedIndex);
      onPostChange?.(boundedIndex, restoredMediaIndex);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    },
    [activePostIndex, getMediaIndex, onPostChange, posts.length],
  );

  const activePost = posts[activePostIndex];
  const activeMediaIndex = getMediaIndex(activePostIndex);

  return {
    activePost,
    activePostIndex,
    activeMediaIndex,
    getId,
    getMediaIndex,
    setActivePost,
    setMediaIndexForPost,
  };
}
