import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  getStatusListSnapshot,
  patchStatusViewed,
  prependStatusFromSocket,
  refreshStatusList,
  removeStatusFromSnapshot,
  shouldRefreshStatusListOnFocus,
  STATUS_PREVIEW_USER_LIMIT,
} from "@/utils/statusList";
import { prefetchStatusStripPreviews } from "@/utils/statusPrefetch";
import { getStatusSocket, bindStatusSocketEvents } from "@/utils/statusSocket";

/** Shared status list — cached first, background refresh, realtime socket patches. */
export function useStatusList() {
  const { user } = useUser();
  const viewerId = user?.id;
  const [statuses, setStatuses] = useState<any[]>(() => getStatusListSnapshot());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const apply = useCallback((list: any[]) => {
    setStatuses(list);
    void prefetchStatusStripPreviews(list, STATUS_PREVIEW_USER_LIMIT);
  }, []);

  const syncFromStore = useCallback(() => {
    apply(getStatusListSnapshot());
  }, [apply]);

  useEffect(() => {
    const hasCache = getStatusListSnapshot().length > 0;
    setIsRefreshing(!hasCache);
    void refreshStatusList({ force: !hasCache, viewerId }).then((list) => {
      apply(list);
      setIsRefreshing(false);
    });
  }, [apply, viewerId]);

  useFocusEffect(
    useCallback(() => {
      if (!shouldRefreshStatusListOnFocus()) return;
      void refreshStatusList({ viewerId }).then(apply);
    }, [apply, viewerId]),
  );

  useEffect(() => {
    const socket = getStatusSocket();
    const unbind = bindStatusSocketEvents(socket, {
      onCreated: (status) => {
        prependStatusFromSocket(status);
        syncFromStore();
      },
      onViewed: (payload) => {
        patchStatusViewed(payload.statusId, payload.userId, payload.views);
        syncFromStore();
      },
      onDeleted: (payload) => {
        removeStatusFromSnapshot(payload.statusId);
        syncFromStore();
      },
    });
    return unbind;
  }, [syncFromStore]);

  return { statuses, isRefreshing };
}
