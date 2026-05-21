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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Call, useStreamVideoClient } from "@stream-io/video-react-native-sdk";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { MediaColors, MediaGradients } from "@/constants/mediaTheme";
import { isStreamCallLive } from "@/utils/isStreamCallLive";

export const HomeScreen = () => {
  const client = useStreamVideoClient();
  const { theme, isDark } = useTheme();
  const { currentLevel, userDetails } = useLevel();
  const insets = useSafeAreaInsets();

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");

  const categories = ["All", "National", "County", "Debates", "Trending"];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const bg = isDark ? MediaColors.black : theme.background;
  const cardBg = isDark ? MediaColors.surfaceElevated : theme.card;
  const textMain = isDark ? MediaColors.textPrimary : theme.text;
  const textSub = isDark ? MediaColors.textSecondary : theme.subtext;

  const isCallLive = useCallback((call: Call) => isStreamCallLive(call), []);

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

  const matchesCategory = useCallback(
    (room: Call) => {
      if (selectedCategory === "All") return true;
      return room.state?.custom?.category === selectedCategory;
    },
    [selectedCategory],
  );

  const filteredRooms = useMemo(() => {
    const filtered = calls.filter(matchesCategory);
    return [...filtered].sort((a, b) => {
      const aLive = isCallLive(a);
      const bLive = isCallLive(b);
      if (aLive === bLive) return 0;
      return aLive ? -1 : 1;
    });
  }, [calls, matchesCategory, isCallLive]);

  const liveRooms = useMemo(
    () => calls.filter((room) => isCallLive(room) && matchesCategory(room)),
    [calls, isCallLive, matchesCategory],
  );

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

      setModalVisible(false);
      setRoomTitle("");
      await fetchCalls();

      router.push({
        pathname: "/(drawer)/(audio)/src/CallScreen",
        params: { callId: id, isHost: "true" },
      });
    } catch (err) {
      console.log("Create error:", err);
    } finally {
      setCreatingRoom(false);
    }
  };

  const openRoom = (room: Call) => {
    const createdById = room.state?.createdBy?.id;
    const me = userDetails?.clerkId;
    const isOwner = Boolean(createdById && me && createdById === me);

    router.push({
      pathname: "/(drawer)/(audio)/src/CallScreen",
      params: { callId: room.id, isHost: isOwner ? "true" : "false" },
    });
  };

  if (loading && calls.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="small" color={MediaColors.liveRed} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" />

      <Animated.View entering={FadeInUp}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={textMain} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textMain }]}>Audio</Text>
            <Text style={[styles.headerSub, { color: textSub }]}>
              {currentLevel?.value?.toUpperCase() || "ROOMS"}
            </Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={fetchCalls}>
            <Ionicons name="refresh" size={22} color={textMain} />
          </Pressable>
        </View>
      </Animated.View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.categoryRow}
              renderItem={({ item }) => {
                const active = item === selectedCategory;
                return (
                  <Pressable onPress={() => setSelectedCategory(item)}>
                    <Text
                      style={[
                        styles.categoryText,
                        { color: active ? textMain : textSub },
                        active && styles.categoryActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />

            <Pressable style={styles.createBanner} onPress={() => setModalVisible(true)}>
              <LinearGradient
                colors={["#7B2FF7", "#FE2C55"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createGradient}
              >
                <View style={styles.micIcon}>
                  <Ionicons name="mic" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.createTitle}>Start a room</Text>
                  <Text style={styles.createSub}>Host a live audio conversation</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </LinearGradient>
            </Pressable>

            <View style={[styles.onAir, { backgroundColor: cardBg }]}>
              <View style={styles.onAirLeft}>
                <View style={styles.pulseDot} />
                <Text style={styles.onAirLabel}>ON AIR</Text>
              </View>
              <Text style={[styles.onAirCount, { color: textMain }]}>
                {liveRooms.length}
              </Text>
              <Text style={[styles.onAirHint, { color: textSub }]}>active rooms</Text>
            </View>

            {liveRooms[0] && (
              <Pressable
                onPress={() => openRoom(liveRooms[0])}
                style={styles.featuredWrap}
              >
                <LinearGradient
                  colors={[...MediaGradients.featured]}
                  style={styles.featuredCard}
                >
                  <View style={styles.featuredTop}>
                    <View style={styles.livePill}>
                      <Text style={styles.livePillText}>LIVE</Text>
                    </View>
                    <Text style={styles.featuredCat}>
                      {liveRooms[0].state?.custom?.category || "Room"}
                    </Text>
                  </View>
                  <Text style={styles.featuredTitle} numberOfLines={2}>
                    {liveRooms[0].state?.custom?.title || "Untitled Room"}
                  </Text>
                  <View style={styles.featuredFooter}>
                    <Ionicons name="people" size={14} color="#fff" />
                    <Text style={styles.featuredMeta}>
                      {liveRooms[0].state?.participants?.length || 0} listening
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            )}

            <Text style={[styles.sectionLabel, { color: textMain }]}>Rooms</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: textSub }]}>
            No rooms in this category
          </Text>
        }
        renderItem={({ item }) => {
          const live = isCallLive(item);

          return (
            <Pressable
              style={[
                styles.roomCard,
                { backgroundColor: cardBg, marginHorizontal: 16 },
                !live && styles.roomCardEnded,
              ]}
              onPress={live ? () => openRoom(item) : undefined}
              disabled={!live}
            >
              {live ? (
                <LinearGradient
                  colors={["#25F4EE", "#7B2FF7"]}
                  style={styles.roomIcon}
                >
                  <Ionicons name="mic" size={20} color="#000" />
                </LinearGradient>
              ) : (
                <View style={[styles.roomIcon, styles.roomIconEnded]}>
                  <Ionicons name="mic-off" size={20} color={textSub} />
                </View>
              )}
              <View style={styles.roomBody}>
                {live ? (
                  <View style={styles.roomLiveTag}>
                    <Text style={styles.roomLiveText}>LIVE</Text>
                  </View>
                ) : (
                  <View style={styles.roomEndedTag}>
                    <Text style={styles.roomEndedText}>ENDED</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.roomTitle,
                    { color: live ? textMain : textSub },
                  ]}
                  numberOfLines={1}
                >
                  {item.state?.custom?.title || "Untitled Room"}
                </Text>
                <Text style={[styles.roomHost, { color: textSub }]} numberOfLines={1}>
                  {item.state?.createdBy?.name || "Host"}
                  {live
                    ? ` · ${item.state?.participants?.length || 0} in room`
                    : " · Session ended"}
                </Text>
              </View>
              {live ? (
                <Ionicons name="chevron-forward" size={20} color={textSub} />
              ) : null}
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <LinearGradient colors={["#7B2FF7", "#FE2C55"]} style={styles.fabInner}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdrop}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setModalVisible(false)}
              />
              <View
                style={[
                  styles.modalSheet,
                  {
                    backgroundColor: cardBg,
                    paddingBottom: Math.max(insets.bottom, 16) + 8,
                  },
                ]}
              >
                <View style={styles.sheetHandle} />
                <Text style={[styles.modalTitle, { color: textMain }]}>
                  Create room
                </Text>
                <Text style={[styles.modalHint, { color: textSub }]}>
                  Category:{" "}
                  {selectedCategory === "All" ? "National" : selectedCategory}
                </Text>
                <TextInput
                  placeholder="Room title"
                  placeholderTextColor={textSub}
                  value={roomTitle}
                  onChangeText={setRoomTitle}
                  style={[
                    styles.modalInput,
                    { color: textMain, borderColor: theme.border },
                  ]}
                  maxLength={60}
                  returnKeyType="done"
                  onSubmitEditing={createRoom}
                />
                <Pressable
                  style={[styles.modalGoBtn, { opacity: creatingRoom ? 0.7 : 1 }]}
                  onPress={createRoom}
                  disabled={creatingRoom}
                >
                  {creatingRoom ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalGoText}>Go live in audio</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 21, fontWeight: "800" },
  headerSub: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  categoryRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 20 },
  categoryText: { fontSize: 14, fontWeight: "600", paddingBottom: 6 },
  categoryActive: {
    borderBottomWidth: 2,
    borderBottomColor: MediaColors.liveRed,
    fontWeight: "800",
  },
  createBanner: { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: "hidden" },
  createGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  micIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  createTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  createSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  onAir: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  onAirLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MediaColors.liveRed,
  },
  onAirLabel: { color: MediaColors.liveRed, fontWeight: "800", fontSize: 11 },
  onAirCount: { fontSize: 21, fontWeight: "800" },
  onAirHint: { fontSize: 12, flex: 1 },
  featuredWrap: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, overflow: "hidden" },
  featuredCard: { padding: 18 },
  featuredTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  livePill: {
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  livePillText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  featuredCat: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  featuredTitle: { color: "#fff", fontSize: 19, fontWeight: "800" },
  featuredFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  featuredMeta: { color: "#fff", fontSize: 12, fontWeight: "600" },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  empty: { textAlign: "center", marginTop: 24, fontSize: 13 },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  roomCardEnded: {
    opacity: 0.55,
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roomIconEnded: {
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  roomBody: { flex: 1 },
  roomLiveTag: {
    alignSelf: "flex-start",
    backgroundColor: MediaColors.liveRedSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  roomLiveText: { color: MediaColors.liveRed, fontSize: 9, fontWeight: "800" },
  roomEndedTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(128,128,128,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  roomEndedText: {
    color: MediaColors.textMuted,
    fontSize: 9,
    fontWeight: "800",
  },
  roomTitle: { fontSize: 14, fontWeight: "700" },
  roomHost: { fontSize: 11, marginTop: 2 },
  fab: {
    position: "absolute",
    bottom: 60,
    right: 20,
    borderRadius: 30,
    overflow: "hidden",
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  modalKeyboardRoot: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.5)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 19, fontWeight: "800", textAlign: "center" },
  modalHint: { fontSize: 12, marginTop: 8, marginBottom: 14, textAlign: "center" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalGoBtn: {
    backgroundColor: "#7B2FF7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalGoText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
