import React, { memo, useCallback, useMemo } from "react";
import { FlatList, View, StyleSheet } from "react-native";
import { CreateStatus } from "./CreateStatus";
import { useTheme } from "@/context/ThemeContext";
import { StatusItem } from "./StatusItem";
import { enrichStatusGroup } from "@/utils/statusUser";

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
}: {
  item: any;
  currentUserId?: string | null;
}) {
  return <StatusItem userStatus={item} currentUserId={currentUserId} />;
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

  const keyExtractor = useCallback((item: any) => item.userId, []);
  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <StatusListItem item={item} currentUserId={currentUserId} />
    ),
    [currentUserId],
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
      <FlatList
        data={groupedStatuses}
        horizontal
        windowSize={5}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={StatusSeparator}
        renderItem={renderItem}
        ListHeaderComponent={StatusListHeader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  listContent: {
    paddingHorizontal: 10,
    alignItems: "flex-start",
    gap: 0,
  },

  separator: {
    width: 6,
  },
});