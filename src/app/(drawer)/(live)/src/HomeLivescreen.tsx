import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { MediaColors, MediaGradients } from "@/constants/mediaTheme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { isStreamCallLive } from "@/utils/isStreamCallLive";
import {
  formatEndedAgo,
  purgeExpiredEndedCalls,
} from "@/utils/livestreamCalls";

type LiveTab = "live" | "ended";

const { width } = Dimensions.get("window");
/** Stream QueryCalls limit is ~60/min per user — avoid hammering on focus/remount */
const MIN_QUERY_INTERVAL_MS = 45_000;
const FOCUS_POLL_MS = 60_000;

function getRetryAfterMs(error: unknown): number {
  const err = error as { status?: number; response?: { headers?: Record<string, string> } };
  if (err?.status !== 429) return 30_000;
  const raw = err.response?.headers?.["retry-after"];
  const sec = raw ? parseInt(String(raw), 10) : NaN;
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : 30_000;
}

/** Survives HomeScreen unmount when user enters a live session */
const liveCallsCache = {
  clientId: "",
  calls: [] as Call[],
  fetchedAt: 0,
};

type Props = {
  client: StreamVideoClient;
  joinCall: (callId: string) => void;
  liveScreen: (
    callId: string,
    meta?: { roomTitle?: string; level?: string },
  ) => void;
};

export const HomeScreen = ({ client, joinCall, liveScreen }: Props) => {
  const { theme, isDark } = useTheme();
  const { currentLevel, userDetails } = useLevel();
  const insets = useSafeAreaInsets();

  const clientId = (client as { user?: { id?: string } })?.user?.id ?? "";
  const cacheValid =
    liveCallsCache.clientId === clientId && liveCallsCache.calls.length > 0;

  const [calls, setCalls] = useState<Call[]>(() =>
    cacheValid ? liveCallsCache.calls : [],
  );
  const [loading, setLoading] = useState(!cacheValid);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState<LiveTab>("live");

  const hasLoadedRef = useRef(cacheValid);
  const lastFetchAtRef = useRef(cacheValid ? liveCallsCache.fetchedAt : 0);
  const fetchInFlightRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bg = isDark ? MediaColors.black : theme.background;
  const cardBg = isDark ? MediaColors.surfaceElevated : theme.card;
  const textMain = isDark ? MediaColors.textPrimary : theme.text;
  const textSub = isDark ? MediaColors.textSecondary : theme.subtext;

  const isCallLive = (call: Call) => isStreamCallLive(call);

  const fetchCalls = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      if (!client || fetchInFlightRef.current) return;

      const now = Date.now();
      const silent = options?.silent ?? hasLoadedRef.current;

      if (
        !options?.force &&
        hasLoadedRef.current &&
        now - lastFetchAtRef.current < MIN_QUERY_INTERVAL_MS
      ) {
        return;
      }

      fetchInFlightRef.current = true;
      if (!silent) {
        if (hasLoadedRef.current) setRefreshing(true);
        else setLoading(true);
      }

      try {
        const res = await client.queryCalls({
          filter_conditions: { type: "livestream" },
          sort: [{ field: "created_at", direction: -1 }],
        });
        const visible = await purgeExpiredEndedCalls(
          res.calls,
          userDetails?.clerkId,
        );
        setCalls(visible);
        hasLoadedRef.current = true;
        lastFetchAtRef.current = Date.now();
        liveCallsCache.clientId = clientId;
        liveCallsCache.calls = visible;
        liveCallsCache.fetchedAt = lastFetchAtRef.current;
      } catch (e) {
        const status = (e as { status?: number })?.status;
        if (status === 429) {
          const waitMs = getRetryAfterMs(e);
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            void fetchCalls({ silent: true });
          }, waitMs);
        } else {
          console.log("queryCalls error:", e);
        }
      } finally {
        fetchInFlightRef.current = false;
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [client, userDetails?.clerkId],
  );

  const refreshCalls = useCallback(() => {
    lastFetchAtRef.current = 0;
    void fetchCalls({ force: true, silent: hasLoadedRef.current });
  }, [fetchCalls]);

  useFocusEffect(
    useCallback(() => {
      void fetchCalls({ silent: false });

      const poll = setInterval(() => {
        void fetchCalls({ silent: true });
      }, FOCUS_POLL_MS);

      return () => {
        clearInterval(poll);
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      };
    }, [fetchCalls]),
  );

  const createRoom = async () => {
    if (!userDetails) return;
    const id = `room_${currentLevel?.value || "home"}_${userDetails.clerkId}_${Date.now()}`;
    const roomTitle = title?.trim() || `${userDetails.nickName}'s Live`;

    setModalVisible(false);
    setTitle("");
    lastFetchAtRef.current = 0;
    liveScreen(id, {
      roomTitle,
      level: currentLevel?.value || "home",
    });
    void fetchCalls({ force: true, silent: true });
  };

  const liveCalls = useMemo(
    () => calls.filter(isCallLive),
    [calls],
  );

  const endedCalls = useMemo(() => {
    return calls
      .filter((c) => !isCallLive(c))
      .sort((a, b) => {
        const aMs =
          a.state.endedAt?.getTime() ??
          a.state.updatedAt?.getTime() ??
          0;
        const bMs =
          b.state.endedAt?.getTime() ??
          b.state.updatedAt?.getTime() ??
          0;
        return bMs - aMs;
      });
  }, [calls]);

  const listData = activeTab === "live" ? liveCalls : endedCalls;

  const openLive = (item: Call) => {
    const createdById = item.state?.createdBy?.id;
    const me = userDetails?.clerkId;
    if (createdById && me && createdById === me) {
      liveScreen(item.id);
    } else {
      joinCall(item.id);
    }
  };

  const renderEndedRow = ({ item }: { item: Call }) => {
    const displayTitle =
      item.state?.custom?.title || (item.state as { title?: string })?.title || "Untitled live";
    const host = item.state?.createdBy?.name || "Broadcaster";

    return (
      <View style={[styles.liveRow, styles.endedRow, { backgroundColor: cardBg }]}>
        <View style={[styles.liveRowThumb, styles.endedThumb]}>
          <Ionicons name="time-outline" size={28} color="rgba(255,255,255,0.7)" />
        </View>
        <View style={styles.liveRowBody}>
          <View style={styles.endedTag}>
            <Text style={styles.endedTagText}>ENDED</Text>
          </View>
          <Text style={[styles.liveRowTitle, { color: textMain }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={[styles.liveRowHost, { color: textSub }]} numberOfLines={1}>
            {host}
          </Text>
          <Text style={[styles.endedAgo, { color: textSub }]}>
            {formatEndedAgo(item)}
          </Text>
        </View>
      </View>
    );
  };

  const renderLiveRow = ({ item }: { item: Call }) => {
    const displayTitle =
      item.state?.custom?.title || (item.state as { title?: string })?.title || "Live now";
    const host = item.state?.createdBy?.name || "Broadcaster";
    const viewers = item.state?.participants?.length || 0;

    return (
      <Pressable
        style={[styles.liveRow, { backgroundColor: cardBg }]}
        onPress={() => openLive(item)}
        accessibilityRole="button"
        accessibilityLabel={`Join live: ${displayTitle} by ${host}`}
      >
        <LinearGradient
          colors={[...MediaGradients.liveCard]}
          style={styles.liveRowThumb}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
          <Ionicons name="play" size={22} color="#fff" style={styles.liveRowPlay} />
        </LinearGradient>
        <View style={styles.liveRowBody}>
          <Text style={[styles.liveRowTitle, { color: textMain }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={[styles.liveRowHost, { color: textSub }]} numberOfLines={1}>
            {host}
          </Text>
          <View style={styles.viewerRow}>
            <Ionicons name="eye" size={13} color={textSub} />
            <Text style={[styles.liveRowViewers, { color: textSub }]}>
              {viewers} watching
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color={textSub} />
      </Pressable>
    );
  };

  const listHeader = (
    <>
      <Pressable style={styles.goLiveBanner} onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={[...MediaGradients.featured]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.goLiveGradient}
        >
          <View style={styles.goLiveIcon}>
            <Ionicons name="videocam" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.goLiveTitle}>Start a live</Text>
            <Text style={styles.goLiveSub}>Go live and connect in real time</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>

      <View style={[styles.tabBar, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
        <Pressable
          style={[styles.tab, activeTab === "live" && styles.tabActive]}
          onPress={() => setActiveTab("live")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "live" ? "#fff" : textSub },
            ]}
          >
            Live{liveCalls.length > 0 ? ` (${liveCalls.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "ended" && styles.tabActive]}
          onPress={() => setActiveTab("ended")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "ended" ? "#fff" : textSub },
            ]}
          >
            Ended{endedCalls.length > 0 ? ` (${endedCalls.length})` : ""}
          </Text>
        </Pressable>
      </View>
    </>
  );

  return (
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={["top"]}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          style={isDark ? "light" : "dark"}
        />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={textMain} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textMain }]}>LIVE</Text>
            <Text style={[styles.headerSub, { color: textSub }]}>
              {currentLevel?.value?.toUpperCase() || "DISCOVER"}
            </Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={refreshCalls}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={textMain} />
            ) : (
              <Ionicons name="refresh" size={22} color={textMain} />
            )}
          </Pressable>
        </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === "live" ? renderLiveRow : renderEndedRow}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading && !hasLoadedRef.current ? (
            <ActivityIndicator
              style={{ marginVertical: 32 }}
              color={MediaColors.liveRed}
            />
          ) : (
            <Text style={[styles.empty, { color: textSub }]}>
              {activeTab === "live"
                ? "No live streams right now. Tap + to start one."
                : "No ended streams in the last 24 hours."}
            </Text>
          )
        }
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={[MediaColors.liveRed, "#FF0050"]}
          style={styles.fabInner}
        >
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
                <Text style={[styles.modalTitle, { color: textMain }]}>Go Live</Text>
                <Text style={[styles.modalHint, { color: textSub }]}>
                  Add a title so viewers know what your stream is about.
                </Text>
                <TextInput
                  placeholder="What's your live about?"
                  placeholderTextColor={textSub}
                  value={title}
                  onChangeText={setTitle}
                  style={[
                    styles.modalInput,
                    { color: textMain, borderColor: theme.border },
                  ]}
                  maxLength={60}
                  returnKeyType="done"
                  onSubmitEditing={createRoom}
                />
                <Pressable style={styles.modalGoBtn} onPress={createRoom}>
                  <Text style={styles.modalGoText}>Start streaming</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 21, fontWeight: "800", letterSpacing: 1 },
  headerSub: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: MediaColors.liveRed,
  },
  tabText: { fontSize: 13, fontWeight: "800" },
  listContent: { paddingBottom: 100 },
  empty: { marginHorizontal: 16, marginBottom: 16, fontSize: 13, textAlign: "center" },
  goLiveBanner: { marginHorizontal: 16, marginBottom: 20, borderRadius: 16, overflow: "hidden" },
  goLiveGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  goLiveIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  goLiveTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  goLiveSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    gap: 12,
    width: width - 32,
    alignSelf: "center",
  },
  liveRowThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  liveRowPlay: { marginTop: 18 },
  liveRowBody: { flex: 1, minWidth: 0 },
  liveRowTitle: { fontSize: 15, fontWeight: "800" },
  liveRowHost: { fontSize: 12, marginTop: 3 },
  liveRowViewers: { fontSize: 11, fontWeight: "600" },
  livePill: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MediaColors.liveRed,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 4,
    zIndex: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  livePillText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  viewerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  endedRow: { opacity: 0.92 },
  endedThumb: {
    backgroundColor: "rgba(80,80,80,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  endedTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(128,128,128,0.45)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  endedTagText: { color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: "800" },
  endedAgo: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 60,
    right: 20,
    borderRadius: 30,
    overflow: "hidden",
    elevation: 8,
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
  modalHint: { fontSize: 13, marginTop: 8, marginBottom: 16, textAlign: "center" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalGoBtn: {
    backgroundColor: MediaColors.liveRed,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalGoText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
