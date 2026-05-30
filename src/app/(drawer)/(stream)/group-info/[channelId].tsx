import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatContext } from "stream-chat-expo";
import { useTheme } from "@/context/ThemeContext";
import { useChatMemberProfiles } from "@/context/ChatMemberProfilesContext";
import {
  buildGroupMemberRows,
  collectMemberIds,
  getGroupChannelName,
  isGroupAdmin,
  isGroupChannel,
  memberCountLabel,
  type GroupMemberRow,
} from "@/utils/groupChat";
import {
  canManageMember,
  demoteGroupAdmin,
  leaveGroup,
  promoteGroupAdmin,
  removeGroupMember,
  updateGroupIcon,
} from "@/utils/groupActions";
import { resolveChatDisplayName } from "@/utils/streamUser";

function parseChannelId(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  const decoded = decodeURIComponent(value);
  return decoded.includes(":") ? decoded.split(":")[1]! : decoded;
}

function MemberRow({
  item,
  isAdminViewer,
  onPress,
}: {
  item: GroupMemberRow;
  isAdminViewer: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={isAdminViewer && !item.isSelf ? onPress : undefined}
      style={[styles.memberRow, { borderBottomColor: theme.border }]}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.memberAvatar} />
      ) : (
        <View style={[styles.memberAvatar, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.memberBody}>
        <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.isCreator ? (
          <Text style={[styles.memberMeta, { color: theme.subtext }]}>
            Group creator
          </Text>
        ) : null}
      </View>
      {item.role === "admin" ? (
        <View style={[styles.roleBadge, { backgroundColor: theme.primary + "22" }]}>
          <Text style={[styles.roleBadgeText, { color: theme.primary }]}>Admin</Text>
        </View>
      ) : null}
      {isAdminViewer && !item.isSelf ? (
        <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
      ) : null}
    </Pressable>
  );
}

export default function GroupInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { client } = useChatContext();
  const { getProfile, ensureProfiles } = useChatMemberProfiles();
  const { channelId: rawChannelId } = useLocalSearchParams<{ channelId: string }>();

  const channelId = parseChannelId(rawChannelId);
  const myId = client.userID ?? "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [groupImage, setGroupImage] = useState<string | undefined>();

  const channel = useMemo(() => {
    if (!client || !channelId) return null;
    return client.channel("messaging", channelId);
  }, [client, channelId]);

  const refreshChannel = useCallback(async () => {
    if (!channel) return;
    await channel.watch();
    const data = channel.data as { image?: string } | undefined;
    setGroupImage(data?.image);
  }, [channel]);

  useEffect(() => {
    if (!channel || !myId) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        await refreshChannel();
        if (!cancelled) {
          await ensureProfiles(collectMemberIds(channel, myId));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channel, myId, refreshChannel, ensureProfiles]);

  const isGroup = channel ? isGroupChannel(channel, myId) : false;
  const iAmAdmin = channel ? isGroupAdmin(channel, myId) : false;
  const groupName = channel ? getGroupChannelName(channel) : "Group";

  const members = useMemo(() => {
    if (!channel || !myId) return [];
    return buildGroupMemberRows(channel, myId, (userId, streamName) =>
      resolveChatDisplayName(userId, streamName, getProfile(userId)),
    );
  }, [channel, myId, getProfile]);

  const myDisplayName = useMemo(() => {
    const me = members.find((m) => m.isSelf);
    if (me && me.name !== "You") return me.name;
    return resolveChatDisplayName(myId, client.user?.name, getProfile(myId));
  }, [members, myId, client.user?.name, getProfile]);

  const pickGroupIcon = async () => {
    if (!channel || !iAmAdmin) return;

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

    setBusy(true);
    try {
      const url = await updateGroupIcon(channel, result.assets[0].uri);
      setGroupImage(url);
      await refreshChannel();
    } catch (err) {
      console.error("updateGroupIcon:", err);
      Alert.alert("Error", "Could not update group icon.");
    } finally {
      setBusy(false);
    }
  };

  const onMemberPress = (member: GroupMemberRow) => {
    if (!channel || !canManageMember(channel, myId, member)) return;

    const actions: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];

    if (member.role === "admin") {
      actions.push({
        text: "Dismiss as admin",
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await demoteGroupAdmin(
                channel,
                member.userId,
                member.name,
                myDisplayName,
              );
              await refreshChannel();
            } catch {
              Alert.alert("Error", "Could not update admin role.");
            } finally {
              setBusy(false);
            }
          })();
        },
      });
    } else {
      actions.push({
        text: "Make group admin",
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await promoteGroupAdmin(
                channel,
                member.userId,
                member.name,
                myDisplayName,
              );
              await refreshChannel();
            } catch {
              Alert.alert("Error", "Could not make admin.");
            } finally {
              setBusy(false);
            }
          })();
        },
      });
    }

    actions.push({
      text: "Remove from group",
      style: "destructive",
      onPress: () => {
        Alert.alert(
          "Remove member",
          `Remove ${member.name} from this group?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => {
                void (async () => {
                  setBusy(true);
                  try {
                    await removeGroupMember(
                      channel,
                      member.userId,
                      member.name,
                      myDisplayName,
                    );
                    await refreshChannel();
                  } catch {
                    Alert.alert("Error", "Could not remove member.");
                  } finally {
                    setBusy(false);
                  }
                })();
              },
            },
          ],
        );
      },
    });

    actions.push({ text: "Cancel", style: "cancel" });

    Alert.alert(member.name, undefined, actions);
  };

  const onLeaveGroup = () => {
    if (!channel) return;

    Alert.alert(
      "Leave group",
      `Leave "${groupName}"? You will stop receiving messages from this group.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await leaveGroup(channel, myId, myDisplayName);
                router.replace("/(drawer)/(stream)/(streamtabs)");
              } catch {
                Alert.alert("Error", "Could not leave the group.");
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (loading || !channel) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!isGroup) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Not a group channel</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.text }]}>Group info</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Pressable
              onPress={iAmAdmin ? () => void pickGroupIcon() : undefined}
              style={styles.avatarWrap}
            >
              {groupImage ? (
                <Image source={{ uri: groupImage }} style={styles.groupAvatar} />
              ) : (
                <View style={[styles.groupAvatar, { backgroundColor: theme.card }]}>
                  <Ionicons name="people" size={40} color={theme.primary} />
                </View>
              )}
              {iAmAdmin ? (
                <View style={[styles.editIcon, { backgroundColor: theme.primary }]}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <Text style={[styles.groupName, { color: theme.text }]}>{groupName}</Text>
            <Text style={[styles.groupMeta, { color: theme.subtext }]}>
              {memberCountLabel(channel)}
              {iAmAdmin ? " · You are an admin" : ""}
            </Text>
            {iAmAdmin ? (
              <Text style={[styles.hint, { color: theme.subtext }]}>
                Tap the photo to change the group icon
              </Text>
            ) : null}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Members</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MemberRow
            item={item}
            isAdminViewer={iAmAdmin}
            onPress={() => onMemberPress(item)}
          />
        )}
        ListFooterComponent={
          <Pressable
            onPress={onLeaveGroup}
            disabled={busy}
            style={[styles.leaveBtn, { borderColor: theme.danger }]}
          >
            <Ionicons name="exit-outline" size={20} color={theme.danger} />
            <Text style={[styles.leaveText, { color: theme.danger }]}>Exit group</Text>
          </Pressable>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      />

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  headerBlock: { alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  avatarWrap: { marginTop: 8, marginBottom: 12 },
  groupAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  editIcon: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  groupMeta: { fontSize: 13, marginTop: 4 },
  hint: { fontSize: 12, marginTop: 8, textAlign: "center" },
  sectionTitle: {
    alignSelf: "stretch",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  memberBody: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "600" },
  memberMeta: { fontSize: 12, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  roleBadgeText: { fontSize: 11, fontWeight: "700" },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaveText: { fontSize: 16, fontWeight: "700" },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
