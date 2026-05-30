import { useEffect, useState } from "react";
import {
  isFeedItemVisible,
  subscribeToFeedVisibility,
} from "@/utils/feedVisibility";

/**
 * Lets a feed row react to its own visibility without re-rendering when
 * sibling rows scroll into view. Pair with `setVisibleFeedItems` in the host
 * list's `onViewableItemsChanged`.
 */
export function useFeedItemVisibility(id: string | undefined | null): boolean {
  const [visible, setVisible] = useState(() =>
    id ? isFeedItemVisible(id) : false,
  );

  useEffect(() => {
    if (!id) {
      setVisible(false);
      return;
    }

    setVisible(isFeedItemVisible(id));
    return subscribeToFeedVisibility(id, setVisible);
  }, [id]);

  return visible;
}
