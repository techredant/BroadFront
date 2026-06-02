import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { CreateStatus } from "./CreateStatus";
import { useTheme } from "@/context/ThemeContext";
import { StatusItem } from "./StatusItem";
import { enrichStatusGroup } from "@/utils/statusUser";
import { STATUS_ITEM_WIDTH } from "@/constants/statusTheme";
import {
  STATUS_PREVIEW_USER_LIMIT,
  warmStatusCachesForUsers,
} from "@/utils/statusList";
import { prefetchStatusMedia } from "@/utils/statusEngine";

interface StatusModel {
  _id: string;
  userId: string;
  viewed?: boolean;
  caption?: string;
  media?: string[];
  backgroundColor?: string;
  createdAt: string;
  views?: { userId: string }[];
  firstName?: string;
  lastName?: string;
  companyName?: string;
  nickName?: string;
  image?: string;
}

type StatusProps = {
  statuses: StatusModel[];
  currentUserId?: string | null;
};

const StatusSeparator = memo(function StatusSeparator() {
  return <View style={styles.separator} />;
});

const StatusListHeader = memo(function StatusListHeader() {
  return <CreateStatus />;
});

const StatusListItem = memo(function StatusListItem({
  item,
  currentUserId,
  allUserIds,
  userIndex,
}: {
  item: any;
  currentUserId?: string | null;
  allUserIds: string[];
  userIndex: number;
}) {
  return (
    <StatusItem
      userStatus={item}
      currentUserId={currentUserId}
      allUserIds={allUserIds}
      userIndex={userIndex}
    />
  );
});

export function Status({ statuses, currentUserId }: StatusProps) {
  const { theme } = useTheme();

  const groupedStatuses = useMemo(
    () =>
      Object.values(
        statuses.reduce((acc: any, status) => {
          const key = status.userId;

          if (!acc[key]) {
            acc[key] = {
              userId: status.userId,
              firstName: status.firstName,
              lastName: status.lastName,
              companyName: status.companyName,
              nickName: status.nickName,
              image: status.image,
              statuses: [],
            };
          }

          acc[key].statuses.push(status);

          return acc;
        }, {}),
      ).map((group: any) => enrichStatusGroup(group)),
    [statuses],
  );

  const browseUserIds = useMemo(
    () => groupedStatuses.map((g: any) => g.userId),
    [groupedStatuses],
  );

  useEffect(() => {
    const warm = browseUserIds.slice(0, STATUS_PREVIEW_USER_LIMIT);
    warmStatusCachesForUsers(warm);
    for (const uid of warm) {
      const stories = groupedStatuses.find((g: any) => g.userId === uid)?.statuses;
      if (stories?.length) void prefetchStatusMedia(stories, 0, 3);
    }
  }, [browseUserIds, groupedStatuses]);

  const keyExtractor = useCallback((item: any) => item.userId, []);
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <StatusListItem
        item={item}
        currentUserId={currentUserId}
        allUserIds={browseUserIds}
        userIndex={index}
      />
    ),
    [browseUserIds, currentUserId],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
    minimumViewTime: 0,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ index: number | null }>;
    }) => {
      const indices = viewableItems
        .map((v) => v.index)
        .filter((i): i is number => typeof i === "number" && i >= 0);
      if (!indices.length) return;

      const minIndex = Math.min(...indices);
      const maxIndex = Math.max(...indices);
      const endIndex = Math.min(groupedStatuses.length - 1, maxIndex + 2);

      const warmIds: string[] = [];
      for (let i = minIndex; i <= endIndex; i++) {
        const group = groupedStatuses[i];
        if (!group?.userId) continue;
        warmIds.push(group.userId);
        const stories = group.statuses;
        if (stories?.length) {
          void prefetchStatusMedia(stories, 0, 3);
        }
      }
      if (warmIds.length) {
        warmStatusCachesForUsers(warmIds);
      }
    },
    [groupedStatuses],
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <FlashList
        data={groupedStatuses}
        horizontal
        estimatedItemSize={STATUS_ITEM_WIDTH}
        drawDistance={STATUS_ITEM_WIDTH * 4}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={StatusSeparator}
        renderItem={renderItem}
        ListHeaderComponent={StatusListHeader}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  listContent: {
    paddingHorizontal: 6,
    alignItems: "flex-start",
    gap: 0,
  },

  separator: {
    width: 2,
  },
});