import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  StatusBar,
  Modal,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Call, useStreamVideoClient } from "@stream-io/video-react-native-sdk";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

export const HomeScreen = () => {
  const client = useStreamVideoClient();
  const { theme, isDark } = useTheme();
  const { currentLevel, userDetails } = useLevel();

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");

  const categories = ["All", "National", "County", "Debates", "Trending"];
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filter, setFilter] = useState<"live" | "all" | "ended">("live");

  const isCallLive = useCallback((call: Call) => {
    const s = call.state as any;
    const endedAt =
      s?.endedAt ?? s?.ended_at ?? (call as any)?.endedAt ?? (call as any)?.ended_at;
    return !endedAt;
  }, []);

  const fetchCalls = useCallback(async () => {
    if (!client) return;

    try {
      setLoading(true);
      const res = await client.queryCalls({
        filter_conditions: { type: "audio_room" },
        sort: [{ field: "created_at", direction: -1 }],
      });
      setCalls(res.calls);
    } catch (e) {
      console.log("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 30000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  useFocusEffect(
    useCallback(() => {
      fetchCalls();
    }, [fetchCalls]),
  );

  const filteredRooms = useMemo(() => {
    return calls.filter((room) => {
      const live = isCallLive(room);

      if (filter === "live" && !live) return false;
      if (filter === "ended" && live) return false;

      if (selectedCategory === "All") return true;
      return room.state?.custom?.category === selectedCategory;
    });
  }, [calls, filter, selectedCategory, isCallLive]);

  const liveRooms = useMemo(() => calls.filter(isCallLive), [calls, isCallLive]);

  const createRoom = async () => {
    if (!client || !userDetails) return;

    try {
      setCreatingRoom(true);

      const id = `audio_${Date.now()}_${userDetails.clerkId}`;
      const title = roomTitle.trim() || `${userDetails.nickName}'s Room`;
      const category = selectedCategory === "All" ? "National" : selectedCategory;

      const call = client.call("audio_room", id);

      await call.getOrCreate({
        data: {
          custom: {
            title,
            category,
            level: currentLevel?.value || "home",
          },
        },
      });

      await call.join();

      setModalVisible(false);
      setRoomTitle("");
      await fetchCalls();

      router.push({
        pathname: "/(drawer)/(audio)/src/CallScreen",
        params: { callId: id },
      });
    } catch (err) {
      console.log("Create error:", err);
    } finally {
      setCreatingRoom(false);
    }
  };

  if (loading && calls.length === 0) {
    return (
      <View
        style={{    
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Animated.View entering={FadeInUp}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>

          <View>
            <Text style={[styles.title, { color: theme.text }]}>Audio Rooms</Text>
            <Text style={{ color: theme.subtext }}>{currentLevel?.value}</Text>
          </View>

          <View style={{ position: "relative", padding: 6 }}>
            <Ionicons name="radio-outline" size={24} color={theme.primary} />
            {calls.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {calls.length > 9 ? "9+" : calls.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
        style={{ maxHeight: 40 }}
        renderItem={({ item }) => {
          const active = item === selectedCategory;
          return (
            <Pressable
              onPress={() => setSelectedCategory(item)}
              style={[
                styles.chip,
                { backgroundColor: active ? theme.primary : theme.card },
              ]}
            >
              <Text style={{ color: active ? "#fff" : theme.text, fontSize: 13 }}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.tabs}>
        {(["live", "all", "ended"] as const).map((t) => {
          const active = filter === t;
          return (
            <Pressable
              key={t}
              onPress={() => setFilter(t)}
              style={[
                styles.tab,
                { backgroundColor: active ? theme.primary : "transparent" },
              ]}
            >
              <Text style={{ color: active ? "#fff" : theme.text }}>
                {t.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.onAirCard, { backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <View style={styles.liveDot} />
          <Text style={{ color: theme.primary, fontWeight: "bold" }}>ON AIR</Text>
        </View>
        <Text style={[styles.bigText, { color: theme.text }]}>
          {liveRooms.length} Active Discussions
        </Text>
      </View>

      {liveRooms[0] && (
        <Pressable
          style={[styles.featured, { backgroundColor: theme.primary }]}
          onPress={() =>
            router.push({
              pathname: "/(drawer)/(audio)/src/CallScreen",
              params: { callId: liveRooms[0].id },
            })
          }
        >
          <Text style={styles.featuredLabel}>FEATURED ROOM</Text>
          <Text style={styles.featuredTitle}>
            {liveRooms[0].state?.custom?.title || "Untitled Room"}
          </Text>
          <Text style={styles.featuredMeta}>
            👥 {liveRooms[0].state?.participants?.length || 0}
          </Text>
        </Pressable>
      )}

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20, color: theme.subtext }}>
            No rooms found
          </Text>
        }
        renderItem={({ item }) => {
          const live = isCallLive(item);
          return (
            <Pressable
              style={[styles.roomCard, { backgroundColor: theme.card }]}
              onPress={
                live
                  ? () =>
                      router.push({
                        pathname: "/(drawer)/(audio)/src/CallScreen",
                        params: { callId: item.id },
                      })
                  : undefined
              }
            >
              <View>
                <Text style={{ color: live ? theme.primary : "gray", fontSize: 12 }}>
                  {live ? "LIVE" : "ENDED"}
                </Text>

                <Text style={[styles.roomTitle, { color: theme.text }]}>
                  {item.state?.custom?.title || "Untitled Room"}
                </Text>

                <Text style={{ color: theme.subtext }}>
                  by {item.state?.createdBy?.name || "Unknown"}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="mic" size={16} color="#fff" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Create Audio Room
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.closeBtn, { borderColor: theme.border }]}
              >
                <Ionicons name="close" size={16} color={theme.subtext} />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: theme.subtext }]}>
              Give your room a clear title so people can join faster.
            </Text>

            <Text style={[styles.inputLabel, { color: theme.text }]}>Room title</Text>
            <View
              style={[
                styles.inputWrap,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <Ionicons name="create-outline" size={16} color={theme.subtext} />
              <TextInput
                value={roomTitle}
                onChangeText={setRoomTitle}
                placeholder="e.g. Morning Politics Brief"
                placeholderTextColor={theme.subtext}
                style={[styles.input, { color: theme.text }]}
                maxLength={60}
                autoFocus
              />
            </View>

            <Text style={[styles.metaLine, { color: theme.subtext }]}>
              Category: {selectedCategory === "All" ? "National" : selectedCategory}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[
                  styles.cancelBtn,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.joinBtn, { opacity: creatingRoom ? 0.75 : 1 }]}
                onPress={createRoom}
                disabled={creatingRoom}
              >
                {creatingRoom ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Create Now</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#ff3b30",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },

  onAirCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red",
  },
  bigText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },

  featured: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 18,
  },
  featuredLabel: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
  },
  featuredMeta: {
    color: "#fff",
    opacity: 0.9,
  },

  roomCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginVertical: 3,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#2563EB",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalBox: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    marginLeft: "auto",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSub: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  inputLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 0,
  },
  metaLine: {
    marginTop: 10,
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  joinBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});