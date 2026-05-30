import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
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
import { RtcSessionProvider, useStreamVideoClient } from "@/rtc";
import type { LiveSessionRecord } from "@/rtc/types";
import { fetchActiveLives, startLiveSession } from "@/rtc/agoraApi";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { MediaColors, MediaGradients } from "@/constants/mediaTheme";
import { isStreamCallActive } from "@/utils/isStreamCallLive";
import { AudioRoomUI } from "./AudioRoomUI";
import type { RtcCall } from "@/rtc/RtcCall";

type AudioSession = {
  callId: string;
  isHost: boolean;
  roomTitle?: string;
};

export const HomeScreen = () => {
  const client = useStreamVideoClient();
  const { theme, isDark } = useTheme();
  const { currentLevel, userDetails } = useLevel();
  const insets = useSafeAreaInsets();

  const [calls, setCalls] = useState<LiveSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [session, setSession] = useState<AudioSession | null>(null);
  const [activeCall, setActiveCall] = useState<RtcCall | null>(null);

  const categories = ["All", "National", "County", "Debates", "Trending"];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const bg = isDark ? MediaColors.black : theme.background;
  const cardBg = isDark ? MediaColors.surfaceElevated : theme.card;
  const textMain = isDark ? MediaColors.textPrimary : theme.text;
  const textSub = isDark ? MediaColors.textSecondary : theme.subtext;

  const sessionAsCallLike = (item: LiveSessionRecord) => ({
    id: item.callId,
    state: {
      custom: item.custom ?? {},
      createdBy: { id: item.hostClerkId },
      backstage: false,
      endedAt: null,
    },
  });

  const isCallLive = useCallback(
    (item: LiveSessionRecord) => isStreamCallActive(sessionAsCallLike(item)),
    [],
  );

  const fetchCalls = useCallback(async () => {
    if (!client) return;
    try {
      setLoading(true);
      const sessions = (await fetchActiveLives("audio")) as LiveSessionRecord[];
      setCalls(sessions.filter(isCallLive));
    } catch (e) {
      console.log("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [client, isCallLive]);

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
    (item: LiveSessionRecord) => {
      if (selectedCategory === "All") return true;
      const category = (item.custom as { category?: string } | undefined)?.category;
      return category === selectedCategory;
    },
    [selectedCategory],
  );

  const filteredCalls = useMemo(
    () => calls.filter(matchesCategory),
    [calls, matchesCategory],
  );

  const joinRoom = useCallback(
    async (callId: string, isHost: boolean, title?: string) => {
      if (!client || !userDetails?.clerkId) return;
      setCreatingRoom(true);
      try {
        const rtcCall = client.call("audio_room", callId);
        const resolvedTitle = title || roomTitle || "Audio room";
        if (isHost) {
          await rtcCall.getOrCreate({
            data: {
              custom: {
                title: resolvedTitle,
                category: selectedCategory === "All" ? "Trending" : selectedCategory,
                level: currentLevel?.value ?? "home",
              },
            },
          });
          await rtcCall.join({ create: true, video: false });
          await startLiveSession({
            callId,
            hostClerkId: userDetails.clerkId,
            variant: "audio",
            roomTitle: resolvedTitle,
            level: currentLevel?.value ?? "home",
          }).catch(() => {});
        } else {
          await rtcCall.join({ create: false, video: false, role: "audience" });
        }
        setActiveCall(rtcCall);
        setSession({ callId, isHost, roomTitle: resolvedTitle });
      } catch (e) {
        console.log("Join room error:", e);
      } finally {
        setCreatingRoom(false);
      }
    },
    [client, userDetails?.clerkId, roomTitle, selectedCategory, currentLevel?.value],
  );

  const createRoom = async () => {
    if (!userDetails?.clerkId) return;
    const id = `audio_${currentLevel?.value || "home"}_${userDetails.clerkId}_${Date.now()}`;
    setModalVisible(false);
    const title = roomTitle.trim() || `${userDetails.nickName || "Host"}'s room`;
    setRoomTitle(title);
    await joinRoom(id, true);
    void fetchCalls();
  };

  const exitSession = useCallback(async () => {
    if (activeCall) {
      if (session?.isHost) await activeCall.endCall().catch(() => {});
      else await activeCall.leave().catch(() => {});
    }
    setActiveCall(null);
    setSession(null);
    setRoomTitle("");
    void fetchCalls();
  }, [activeCall, session?.isHost, fetchCalls]);

  if (session && activeCall) {
    return (
      <RtcSessionProvider call={activeCall}>
        <AudioRoomUI goToHomeScreen={exitSession} isHost={session.isHost} />
      </RtcSessionProvider>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textMain }]}>Audio rooms</Text>
        <Pressable style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedCategory(item)}
            style={[
              styles.chip,
              selectedCategory === item && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedCategory === item ? "#fff" : textSub },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCalls}
          keyExtractor={(item) => item.callId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: textSub }]}>
              No live audio rooms right now. Start one!
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: cardBg }]}
              onPress={() =>
                void joinRoom(
                  item.callId,
                  item.hostClerkId === userDetails?.clerkId,
                  itemTitle(item),
                )
              }
            >
              <LinearGradient
                colors={[...MediaGradients.audioRoom]}
                style={styles.cardIcon}
              >
                <Ionicons name="mic" size={24} color="#fff" />
              </LinearGradient>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: textMain }]} numberOfLines={1}>
                  {itemTitle(item)}
                </Text>
                <Text style={[styles.cardSub, { color: textSub }]}>
                  {item.viewerCount ?? 0} listening
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textSub} />
            </Pressable>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalBackdrop}
          >
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.modalTitle, { color: textMain }]}>
                Start audio room
              </Text>
              <TextInput
                value={roomTitle}
                onChangeText={setRoomTitle}
                placeholder="Room title"
                placeholderTextColor={textSub}
                style={[styles.input, { color: textMain, borderColor: textSub }]}
              />
              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={() => void createRoom()}
                disabled={creatingRoom}
              >
                {creatingRoom ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Go live</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancel, { color: textSub }]}>Cancel</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

function itemTitle(item: LiveSessionRecord) {
  return item.roomTitle || (item.custom as { title?: string })?.title || "Audio room";
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: "800" },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MediaColors.liveRed,
    alignItems: "center",
    justifyContent: "center",
  },
  categories: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  chipText: { fontWeight: "700", fontSize: 12 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", paddingTop: 40, fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "800" },
  cancel: { textAlign: "center", paddingVertical: 8, fontWeight: "600" },
});
