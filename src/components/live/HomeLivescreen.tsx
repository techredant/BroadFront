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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { isStreamCallLive } from "@/utils/isStreamCallLive";
import {
  isMarketLiveCall,
  isCommunityLiveCall,
  marketLiveCallId,
  type MarketLiveProduct,
} from "@/utils/marketLive";
import { getPoliticalColors } from "@/constants/politicalTheme";

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
    meta?: {
      roomTitle?: string;
      level?: string;
      productId?: string;
      productTitle?: string;
      productPrice?: number;
      productImage?: string;
    },
  ) => void;
  mode?: "community" | "market";
  pendingMarketLive?: MarketLiveProduct | null;
  openGoLiveOnMount?: boolean;
  onGoLiveModalOpened?: () => void;
};

export const HomeScreen = ({
  client,
  joinCall,
  liveScreen,
  mode = "community",
  pendingMarketLive,
  openGoLiveOnMount,
  onGoLiveModalOpened,
}: Props) => {
  const { theme, isDark } = useTheme();
  const civic = useMemo(() => getPoliticalColors(isDark), [isDark]);
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
        const visible = (res.calls ?? []).filter(isCallLive);
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

  React.useEffect(() => {
    if (!openGoLiveOnMount) return;
    setModalVisible(true);
    onGoLiveModalOpened?.();
  }, [openGoLiveOnMount, onGoLiveModalOpened]);

  const createRoom = async () => {
    if (!userDetails) return;
    const marketProduct = mode === "market" ? pendingMarketLive : null;
    const id =
      mode === "market"
        ? marketLiveCallId(userDetails.clerkId, marketProduct?.productId)
        : `room_${currentLevel?.value || "home"}_${userDetails.clerkId}_${Date.now()}`;
    const roomTitle =
      title?.trim() ||
      (marketProduct
        ? `Selling: ${marketProduct.title}`
        : `${userDetails.nickName}'s Live`);

    setModalVisible(false);
    setTitle("");
    lastFetchAtRef.current = 0;
    liveScreen(id, {
      roomTitle,
      level: currentLevel?.value || "home",
      productId: marketProduct?.productId,
      productTitle: marketProduct?.title,
      productPrice: marketProduct?.price,
      productImage: marketProduct?.image,
    });
    void fetchCalls({ force: true, silent: true });
  };

  const liveCalls = useMemo(
    () =>
      calls.filter(
        (call) =>
          isCallLive(call) &&
          (mode === "market" ? isMarketLiveCall(call) : isCommunityLiveCall(call)),
      ),
    [calls, mode],
  );

  const listData = liveCalls;

  const openLive = (item: Call) => {
    const createdById = item.state?.createdBy?.id;
    const me = userDetails?.clerkId;
    if (createdById && me && createdById === me) {
      liveScreen(item.id);
    } else {
      joinCall(item.id);
    }
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
  );

  return (
      <View style={[styles.root, { backgroundColor: bg }]}>

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={textMain} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textMain }]}>LIVE</Text>
            <Text style={[styles.headerSub, { color: textSub }]}>
              {currentLevel?.value?.toUpperCase() || "DISCOVER"}
            </Text>
          </View>
          <View
            style={[styles.timePill, { backgroundColor: civic.actionBar }]}
          >
            <Text style={[styles.timeText, { color: textSub }]}>
              {new Date().toLocaleTimeString("en-US", { 
                hour: "2-digit", 
                minute: "2-digit" 
              }).toUpperCase()}
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
        renderItem={renderLiveRow}
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
              No live streams right now. Tap + to start one.
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 21, fontWeight: "800", letterSpacing: 1 },
  headerSub: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
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
