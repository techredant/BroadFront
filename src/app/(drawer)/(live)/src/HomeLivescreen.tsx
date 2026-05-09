import React, { useCallback, useEffect, useState } from "react";
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
import Animated, { FadeInUp } from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

const { width } = Dimensions.get("window");

type Props = {
  client: StreamVideoClient;
  joinCall: (callId: string) => void; // viewer mode
  liveScreen: (callId: string) => void; // host mode
};

export const HomeScreen = ({ client, joinCall, liveScreen }: Props) => {
  const { theme } = useTheme();
  const { currentLevel, userDetails } = useLevel();

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");

  const isCallLive = (call: Call) => {
    const s = call.state as any;
    const endedAt =
      s?.endedAt ??
      s?.ended_at ??
      (call as any)?.endedAt ??
      (call as any)?.ended_at;
  
    return !endedAt;
  };

  const fetchCalls = useCallback(async () => {
    if (!client) return;

    setLoading(true);
    try {
      const res = await client.queryCalls({
        filter_conditions: { type: "livestream" },
        sort: [{ field: "created_at", direction: -1 }],
      });

      setCalls(res.calls);
    } catch (e) {
      console.log("queryCalls error:", e);
    } finally {
      setLoading(false);
    }
  }, [client]);

  // initial load
  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // refresh every time this screen gets focus
  useFocusEffect(
    useCallback(() => {
      fetchCalls();
    }, [fetchCalls]),
  );

  const createTitle = () => {
    setModalVisible(true);
  };

const createRoom = async () => {
  if (!userDetails) return;

  const id = `room_${currentLevel?.value || "home"}_${userDetails.clerkId}_${Date.now()}`;

  const roomTitle = title?.trim() || `${userDetails.nickName}'s Room`;

  try {
    const call = client.call("livestream", id);

    await call.getOrCreate({
      data: {
        custom: {
          title: roomTitle,
          level: currentLevel?.value || "home",
        },
      },
    });

    setModalVisible(false);
    setTitle("");

    await fetchCalls();

    liveScreen(id);
  } catch (e) {
    console.log("Create room error:", e);
  }
};
  const liveCalls = calls.filter(isCallLive);

  const openLive = (item: Call) => {
    const createdById = item.state?.createdBy?.id;
    const me = userDetails?.clerkId;
  
    if (createdById && me && createdById === me) {
      liveScreen(item.id); // host
    } else {
      joinCall(item.id);   // viewer
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.View entering={FadeInUp}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>

          <View style={{ paddingTop: 10 }}>
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
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
                  {liveCalls.length > 9 ? "9+" : liveCalls.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
            <ActivityIndicator size="small" color={theme.text} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {liveCalls.map((item) => {
              const displayTitle =
              item.state?.custom?.title ||
              (item.state as any)?.title ||
              "Untitled Room";
              return (
              <Pressable
                key={item.id}
                style={[styles.liveCard, { backgroundColor: theme.card }]}
                onPress={() => openLive(item)}
              >
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>

                <Text style={[styles.roomTitle, { color: theme.text }]}>
                    {displayTitle}
                  </Text>

                <Text style={{ color: theme.subtext }}>
                  👥 {item.state?.participants?.length || 0}
                </Text>
              </Pressable>
            );
          })}
          </ScrollView>
        )}

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
              const isLive = isCallLive(item);

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
                      {item.state?.custom?.title || "Untitled Room"}
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

      <Pressable style={styles.fab} onPress={createTitle}>
        <Ionicons name="add" size={28} color="#fff" />
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
        <View style={styles.modalIconWrap}>
          <Ionicons name="radio" size={18} color="#fff" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Create Live Room</Text>
        <Pressable
          onPress={() => setModalVisible(false)}
          style={[styles.closeBtn, { borderColor: theme.border }]}
        >
          <Ionicons name="close" size={16} color={theme.subtext} />
        </Pressable>
      </View>

      <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>
        Add a clear room title so people know what this live is about.
      </Text>

      <Text style={[styles.inputLabel, { color: theme.text }]}>Room title</Text>

      <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <Ionicons name="create-outline" size={16} color={theme.subtext} />
        <TextInput
          placeholder="e.g. County Budget Discussion"
          placeholderTextColor={theme.subtext}
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { color: theme.text }]}
          maxLength={60}
          autoFocus
          returnKeyType="done"
        />
      </View>

      <Text style={[styles.counter, { color: theme.subtext }]}>
        {(title?.trim()?.length || 0)}/60
      </Text>

      <View style={styles.modalActions}>
        <Pressable
          onPress={() => setModalVisible(false)}
          style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
        >
          <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[
            styles.joinBtn,
            { opacity: loading ? 0.7 : 1 },
          ]}
          onPress={createRoom}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.joinText}>Go Live</Text>
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
    paddingHorizontal: 16,
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

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  closeBtn: {
    marginLeft: "auto",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
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
  inputWrapper: {
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
  counter: {
    marginTop: 6,
    fontSize: 11,
    textAlign: "right",
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
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontWeight: "600",
  },
  joinBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  joinText: {
    color: "#fff",
    fontWeight: "700",
  },
});