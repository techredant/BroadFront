import { MutableRefObject, useCallback, useEffect, useMemo } from "react";
import * as Haptics from "expo-haptics";

interface UsePostNavigationConfig {
  totalPosts: number;
  currentPostIndex: number;
  currentMediaIndex: number;
  onPostChange: (index: number, mediaIndex: number) => void;
  onMediaIndexReset?: () => void;
  getPostId?: (index: number) => string | undefined;
  mediaIndexByPostIdRef?: MutableRefObject<Map<string, number>>;
}

export const usePostNavigation = ({
  totalPosts,
  currentPostIndex,
  currentMediaIndex,
  onPostChange,
  onMediaIndexReset,
  getPostId,
  mediaIndexByPostIdRef,
}: UsePostNavigationConfig) => {
  const canNavigate = useMemo(
    () => ({
      next: currentPostIndex < totalPosts - 1,
      prev: currentPostIndex > 0,
    }),
    [currentPostIndex, totalPosts],
  );

  useEffect(() => {
    const postId = getPostId?.(currentPostIndex);
    if (!postId) return;
    mediaIndexByPostIdRef?.current.set(postId, currentMediaIndex);
  }, [
    currentMediaIndex,
    currentPostIndex,
    getPostId,
    mediaIndexByPostIdRef,
  ]);

  const saveCurrentMediaIndex = useCallback(() => {
    const postId = getPostId?.(currentPostIndex);
    if (!postId) return;
    mediaIndexByPostIdRef?.current.set(postId, currentMediaIndex);
  }, [
    currentMediaIndex,
    currentPostIndex,
    getPostId,
    mediaIndexByPostIdRef,
  ]);

  const getSavedMediaIndex = useCallback(
    (targetIndex: number) => {
      const postId = getPostId?.(targetIndex);
      if (!postId) return 0;
      return mediaIndexByPostIdRef?.current.get(postId) ?? 0;
    },
    [getPostId, mediaIndexByPostIdRef],
  );

  const goToNextPost = useCallback(() => {
    if (currentPostIndex >= totalPosts - 1) return false;

    const nextIndex = currentPostIndex + 1;
    const restoredMediaIndex = getSavedMediaIndex(nextIndex);
    saveCurrentMediaIndex();
    onMediaIndexReset?.();
    onPostChange(nextIndex, restoredMediaIndex);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    return true;
  }, [
    currentPostIndex,
    getSavedMediaIndex,
    onMediaIndexReset,
    onPostChange,
    saveCurrentMediaIndex,
    totalPosts,
  ]);

  const goToPrevPost = useCallback(() => {
    if (currentPostIndex <= 0) return false;

    const nextIndex = currentPostIndex - 1;
    const restoredMediaIndex = getSavedMediaIndex(nextIndex);
    saveCurrentMediaIndex();
    onMediaIndexReset?.();
    onPostChange(nextIndex, restoredMediaIndex);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    return true;
  }, [
    currentPostIndex,
    getSavedMediaIndex,
    onMediaIndexReset,
    onPostChange,
    saveCurrentMediaIndex,
  ]);

  return {
    goToNextPost,
    goToPrevPost,
    canNavigateNext: canNavigate.next,
    canNavigatePrev: canNavigate.prev,
    currentPostIndex,
  };
};
