import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";

const { width } = Dimensions.get("window");

type Props = {
  client: StreamVideoClient;
  joinCall: (callId: string) => void;
};

export const HomeScreen = ({ client, joinCall }: Props) => {
  const { theme } = useTheme();
  const { currentLevel, userDetails } = useLevel();

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");

  // Fetch live rooms
  useEffect(() => {
    if (!client) return;

    const fetchCalls = async () => {
      try {
        const res = await client.queryCalls({
          filter_conditions: { type: "livestream" },
          sort: [{ field: "created_at", direction: -1 }],
        });
        setCalls(res.calls);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [client]);

  const createTitle = () => {
    setModalVisible(true);
  };

  const createRoom = async () => {
    if (!userDetails) return;

    const id = `room_${currentLevel?.value}_${userDetails.clerkId}`;

    const call = client.call("livestream", id, {
      custom: {
        title: `${userDetails.nickName}'s Room`,
      },
    });

    await call.join({ create: true });
    joinCall(id);
  };

  // Separate live vs ended
  const liveCalls = calls.filter((c) => !c.state?.endedAt);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* HEADER */}
      <DrawerMenuButton />
      <Animated.View entering={FadeInUp}>
        <View style={styles.header}>
          <Text></Text>
          <View style={{ paddingTop: 10}}>
            <Text style={[styles.level, { color: theme.text }]}>
              {currentLevel?.value?.toUpperCase()} Live Streams
            </Text>
            <Text style={{ color: theme.subtext }}>
              Join conversations happening now
            </Text>
          </View>

          <View style={{ position: "relative", padding: 6 }}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.text}
            />

            {liveCalls.length > 0 && (
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
                  {liveCalls.length > 9 ? "9+" : liveCalls.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* NOW LIVE */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          🔴 Happening Now
        </Text>

        {loading ? (
          <View
            style={{
              height: 120,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {liveCalls.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.liveCard, { backgroundColor: theme.card }]}
                onPress={() => joinCall(item.id)}
              >
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>

                <Text style={[styles.roomTitle, { color: theme.text }]}>
                  {item.state?.custom?.title || "Youth and sports"}
                </Text>

                <Text style={{ color: theme.subtext }}>
                  👥 {item.state?.participants?.length || 0}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* DISCOVER */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Discover Lives
        </Text>

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 20 }}
            size="small"
            color={theme.primary}
          />
        ) : (
          <FlatList
            data={calls}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isLive = !item.state?.endedAt;

              return (
                <Pressable
                  style={[styles.listCard, { backgroundColor: theme.card }]}
                  onPress={isLive ? () => joinCall(item.id) : undefined}
                >
                  <View>
                    <Text style={{ color: isLive ? "red" : "gray" }}>
                      {isLive ? "LIVE" : "ENDED"}
                    </Text>

                    <Text style={[styles.roomTitle, { color: theme.text }]}>
                      {item.state?.custom?.title || "National budget"}
                    </Text>

                    <Text style={{ color: theme.subtext }}>
                      by {item.state?.createdBy?.name || "Unknown"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.text}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </ScrollView>

      {/* FLOAT BUTTON */}
      <Pressable style={styles.fab} onPress={createTitle}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>Enter Room Title</Text>

            <TextInput
              placeholder="Room title..."
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

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

const styles = StyleSheet.create({
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  level: {
    fontSize: 20,
    fontWeight: "bold",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },

  liveCard: {
    width: width * 0.6,
    marginLeft: 16,
    borderRadius: 16,
    padding: 16,
  },

  liveBadge: {
    backgroundColor: "red",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },

  liveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  roomTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },

  listCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#ff3b30",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
  // fab: {
  //   position: "absolute",
  //   bottom: 40,
  //   right: 20,
  //   backgroundColor: "#1F2937",
  //   width: 60,
  //   height: 60,
  //   borderRadius: 30,
  //   alignItems: "center",
  //   justifyContent: "center",
  //   elevation: 5,
  // },
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
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
  },
  joinBtn: {
    marginTop: 15,
    backgroundColor: "#2563EB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
