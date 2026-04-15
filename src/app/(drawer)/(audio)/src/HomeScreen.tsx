import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  StatusBar,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  StreamVideoClient,
  Call,
  useStreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

export const HomeScreen = () => {
  const client = useStreamVideoClient();
  const { theme, isDark } = useTheme();
  const { currentLevel, userDetails } = useLevel();

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  /* ================= DISCOVER ================= */
  const categories = ["All", "National", "County", "Debates", "Trending"];
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filter, setFilter] = useState<"live" | "all" | "ended">("live");

  /* ================= FETCH ================= */
  useEffect(() => {
    if (!client) return;

    const fetch = async () => {
      try {
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
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [client]);

  const createTitle = () => {
    setModalVisible(true);
  };

  /* ================= FILTER ROOMS ================= */
  const filteredRooms = calls.filter((room) => {
    const isLive = !room.state?.endedAt;

    if (filter === "live" && !isLive) return false;
    if (filter === "ended" && isLive) return false;

    if (selectedCategory === "All") return true;

    return room.state?.custom?.category === selectedCategory;
  });

  const liveRooms = calls.filter((c) => !c.state?.endedAt);

  /* ================= CREATE ROOM ================= */
  const createRoom = async () => {
    if (!client || !userDetails) {
      console.log("Client not ready");
      return;
    }

    const id = `audio_${Date.now()}_${userDetails.clerkId}`;

    try {
      const call = client.call("audio_room", id);

      await call.join({
        create: true,
        data: {
          custom: {
            title: `${userDetails.nickName}'s Room`,
            category:
              selectedCategory === "All" ? "National" : selectedCategory,
          },
        },
      });

      router.push({
        pathname: "/audio/src/CallScreen",
        params: { callId: id },
      });
    } catch (err) {
      console.log("Create error:", err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ================= HEADER ================= */}
      <Animated.View entering={FadeInUp}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>

          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Audio Rooms
            </Text>
            <Text style={{ color: theme.subtext }}>{currentLevel?.value}</Text>
          </View>

          <View style={{ position: "relative", padding: 6 }}>
            <Ionicons name="radio-outline" size={24} color={theme.primary} />

            {calls.length > 0 && (
              <View
                style={{
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
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                >
                  {calls.length < 9 ? "9+" : calls.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ================= DISCOVER CHANNELS ================= */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 4, // 🔥 reduce vertical space
        }}
        style={{ maxHeight: 40 }} // 🔥 force smaller height
        renderItem={({ item }) => {
          const active = item === selectedCategory;

          return (
            <Pressable
              onPress={() => setSelectedCategory(item)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6, // 🔥 smaller button height
                borderRadius: 16,
                marginRight: 8,
                backgroundColor: active ? theme.primary : theme.card,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: active ? "#fff" : theme.text,
                  fontSize: 13, // 🔥 slightly smaller text
                  fontWeight: "500",
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* ================= FILTER TABS ================= */}
      <View style={styles.tabs}>
        {["live", "all", "ended"].map((t) => {
          const active = filter === t;

          return (
            <Pressable
              key={t}
              onPress={() => setFilter(t as any)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.primary : "transparent",
                },
              ]}
            >
              <Text style={{ color: active ? "#fff" : theme.text }}>
                {t.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ================= ON AIR ================= */}
      <View style={[styles.onAirCard, { backgroundColor: theme.card }]}>
        <View style={styles.row}>
          <View style={styles.liveDot} />
          <Text style={{ color: theme.primary, fontWeight: "bold" }}>
            ON AIR
          </Text>
        </View>

        <Text style={[styles.bigText, { color: theme.text }]}>
          {liveRooms.length} Active Discussions
        </Text>
      </View>

      {/* ================= FEATURED ================= */}
      {liveRooms[0] && (
        <Pressable
          style={[styles.featured, { backgroundColor: theme.primary }]}
          onPress={() =>
            router.push({
              pathname: "/audio/src/CallScreen",
              params: { callId: liveRooms[0].id },
            })
          }
        >
          <Text style={styles.featuredLabel}>FEATURED ROOM</Text>

          <Text style={styles.featuredTitle}>
            {liveRooms[0].state?.custom?.title}
          </Text>

          <Text style={styles.featuredMeta}>
            👥 {liveRooms[0].state?.participants?.length || 0}
          </Text>
        </Pressable>
      )}

      {/* ================= ROOM LIST ================= */}
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No rooms found
          </Text>
        }
        renderItem={({ item }) => {
          const isLive = !item.state?.endedAt;

          return (
            <Pressable
              style={[styles.roomCard, { backgroundColor: theme.card }]}
              onPress={
                isLive
                  ? () =>
                      router.push({
                        pathname: "/audio/src/CallScreen",
                        params: { callId: item.id },
                      })
                  : undefined
              }
            >
              <View>
                <Text
                  style={{
                    color: isLive ? theme.primary : "gray",
                    fontSize: 12,
                  }}
                >
                  {isLive ? "LIVE" : "ENDED"}
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

      {/* ================= CREATE BUTTON ================= */}
      <Pressable style={styles.fab} onPress={createTitle}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>Enter Room</Text>

            <Pressable style={styles.joinBtn} onPress={createRoom}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Create Now
              </Text>
            </Pressable>

            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={{ marginTop: 10, color: "gray" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ================= STYLES ================= */

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

  tabs: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  joinBtn: {
    marginTop: 15,
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
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
    backgroundColor: "blue",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
});
