import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { useChatContext } from "stream-chat-expo";
import { useFollowContext } from "@/context/FollowContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppContext } from "@/contexts/AppProvider";
import { useCreateGroupChat } from "@/hooks/useCreateGroupChat";
import { formatNickHandle } from "@/utils/nickName";
import type { StreamChatTarget } from "@/utils/streamUser";

function avatarUri(item: StreamChatTarget & { image?: string | null }) {
  if (item.image) return item.image;
  const name = item.firstName || item.companyName || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1B3A6B&color=fff`;
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useUser();
  const { client } = useChatContext();
  const { setChannel } = useAppContext();
  const userId = user?.id ?? "";

  const { followerUsers, followingUsers } = useFollowContext();
  const [groupName, setGroupName] = useState("");
  const [groupImageUri, setGroupImageUri] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, StreamChatTarget>>(
    {},
  );
  const [creating, setCreating] = useState(false);

  const { handleCreateGroup } = useCreateGroupChat({
    client,
    userId,
    setChannel,
    setCreating,
  });

  const connections = useMemo(() => {
    const map = new Map<string, StreamChatTarget & { image?: string | null }>();
    for (const u of [...followerUsers, ...followingUsers]) {
      if (u.clerkId && u.clerkId !== userId) {
        map.set(u.clerkId, u);
      }
    }
    return [...map.values()];
  }, [followerUsers, followingUsers, userId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.toLowerCase();
    return connections.filter((u) => {
      const name =
        `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.companyName ?? ""}`.toLowerCase();
      const nick = (u.nickName ?? "").toLowerCase();
      return name.includes(q) || nick.includes(q);
    });
  }, [connections, search]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);

  const toggleMember = useCallback((item: StreamChatTarget) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.clerkId]) {
        delete next[item.clerkId];
      } else {
        next[item.clerkId] = item;
      }
      return next;
    });
  }, []);

  const pickGroupImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to set a group icon.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    setGroupImageUri(result.assets[0].uri);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: (typeof connections)[0] }) => {
      const checked = Boolean(selected[item.clerkId]);
      const displayName = item.firstName
        ? `${item.firstName} ${item.lastName ?? ""}`.trim()
        : item.companyName || "Member";

      return (
        <Pressable
          onPress={() => toggleMember(item)}
          style={[styles.row, { borderBottomColor: theme.border }]}
        >
          <Image
            source={{ uri: avatarUri(item) }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.rowMeta}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.handle, { color: theme.subtext }]} numberOfLines={1}>
              {formatNickHandle(item.nickName)}
            </Text>
          </View>
          <View
            style={[
              styles.check,
              {
                borderColor: checked ? theme.primary : theme.border,
                backgroundColor: checked ? theme.primary : "transparent",
              },
            ]}
          >
            {checked ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : null}
          </View>
        </Pressable>
      );
    },
    [selected, theme, toggleMember],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>New group</Text>
        <Pressable
          onPress={() => handleCreateGroup(groupName, selectedList, groupImageUri)}
          disabled={creating || selectedList.length < 2 || !groupName.trim()}
          hitSlop={8}
        >
          {creating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text
              style={{
                color:
                  selectedList.length >= 2 && groupName.trim()
                    ? theme.primary
                    : theme.subtext,
                fontWeight: "700",
                fontSize: 16,
              }}
            >
              Create
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.form}>
        <Pressable
          onPress={() => void pickGroupImage()}
          style={[styles.groupAvatarWrap, { borderColor: theme.border }]}
        >
          {groupImageUri ? (
            <Image
              source={{ uri: groupImageUri }}
              style={styles.groupAvatar}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.groupAvatar,
                styles.groupAvatarPlaceholder,
                { backgroundColor: theme.card },
              ]}
            >
              <Ionicons name="camera" size={28} color={theme.subtext} />
            </View>
          )}
          <View style={[styles.groupAvatarBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        </Pressable>
        <Text style={[styles.groupPhotoHint, { color: theme.subtext }]}>
          Tap to add group photo
        </Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name"
          placeholderTextColor={theme.subtext}
          style={[
            styles.nameInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.card,
            },
          ]}
          maxLength={80}
        />
        <Text style={[styles.hint, { color: theme.subtext }]}>
          {selectedList.length} selected · min. 2 people
        </Text>
      </View>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.subtext} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search connections"
          placeholderTextColor={theme.subtext}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.clerkId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.subtext }]}>
            Follow people to add them to a group
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40 },
  title: { fontSize: 17, fontWeight: "700" },
  form: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, alignItems: "center" },
  groupAvatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  groupAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  groupPhotoHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  nameInput: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  hint: { marginTop: 8, fontSize: 13 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  rowMeta: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  handle: { fontSize: 13, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { textAlign: "center", padding: 32, fontSize: 14 },
});
