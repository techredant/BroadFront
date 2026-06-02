import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  AppState,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import type { AgoraRtcClient } from "@/rtc/RtcCall";
import type { LiveSessionRecord } from "@/rtc/types";
import { fetchActiveLives } from "@/rtc/agoraApi";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { MediaColors, MediaGradients } from "@/constants/mediaTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isStreamCallOnAir, isStreamCallEnded } from "@/utils/isStreamCallLive";
import { getPoliticalColors } from "@/constants/politicalTheme";
import { syncChatMemberProfiles } from "@/utils/streamUser";
import { LIVE_HOME_POLL_MS, SOCKET_IO_DISABLED_ON_HOST } from "@/constants/api";
import { CACHE_TTL, setCached, shouldRefetchOnFocus } from "@/utils/staleFetch";
import { createFeedSocket } from "@/utils/feedSocket";
import { bindLiveSignaling } from "@/rtc/agoraSignaling";

const { width } = Dimensions.get("window");
const MANUAL_REFRESH_COOLDOWN_MS = 2000;
const AUDIO_ACCENT = "#BF5AF2";

const LEVEL_CATEGORY_LABELS: Record<string, string> = {
  home: "National",
  county: "County",
  constituency: "Constituency",
  ward: "Ward",
};

/** Survives unmount when user enters an audio room */
const audioCallsCache = {
  clientId: "",
  calls: [] as LiveSessionRecord[],
  fetchedAt: 0,
};

type Props = {
  client: AgoraRtcClient;
  joinRoom: (
    callId: string,
    meta?: {
      hostClerkId?: string;
      roomTitle?: string;
    },
  ) => void;
  audioScreen: (
    callId: string,
    meta?: {
      roomTitle?: string;
      level?: string;
      category?: string;
    },
  ) => void;
  openCreateOnMount?: boolean;
  onCreateModalOpened?: () => void;
};

export const HomeAudioScreen = ({
  client,
  joinRoom,
  audioScreen,
  openCreateOnMount,
  onCreateModalOpened,
}: Props) => {
  const { theme, isDark } = useTheme();
  const civic = useMemo(() => getPoliticalColors(isDark), [isDark]);
  const { currentLevel, userDetails } = useLevel();
  const insets = useSafeAreaInsets();

  const clientId = client?.userId ?? "";
  const cacheValid =
    audioCallsCache.clientId === clientId && audioCallsCache.calls.length > 0;

  const [calls, setCalls] = useState<LiveSessionRecord[]>(() =>
    cacheValid ? audioCallsCache.calls : [],
  );
  const [loading, setLoading] = useState(!cacheValid);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [audioTab, setAudioTab] = useState<"live" | "ended">("live");
  const [hostProfiles, setHostProfiles] = useState<Record<string, string>>({});

  const hasLoadedRef = useRef(cacheValid);
  const lastFetchAtRef = useRef(cacheValid ? audioCallsCache.fetchedAt : 0);
  const fetchInFlightRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bg = isDark ? MediaColors.black : theme.background;
  const cardBg = isDark ? MediaColors.surfaceElevated : theme.card;
  const textMain = isDark ? MediaColors.textPrimary : theme.text;
  const textSub = isDark ? MediaColors.textSecondary : theme.subtext;

  const categoryLabel = useMemo(() => {
    const key = (currentLevel?.type ?? "home").toLowerCase();
    return (
      LEVEL_CATEGORY_LABELS[key] ??
      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }, [currentLevel?.type]);

  const sessionAsCallLike = (session: LiveSessionRecord) => ({
    id: session.callId,
    state: {
      custom: session.custom ?? {},
      createdBy: { id: session.hostClerkId },
      backstage: false,
      endedAt:
        session.status === "ended"
          ? session.endedAt
            ? new Date(session.endedAt).getTime()
            : Date.now()
          : null,
    },
    status: session.status,
    endedAt: session.endedAt,
  });

  const isSessionEnded = (session: LiveSessionRecord) =>
    session.status === "ended" || isStreamCallEnded(sessionAsCallLike(session));

  const isRoomLive = (session: LiveSessionRecord) =>
    !isSessionEnded(session) && isStreamCallOnAir(sessionAsCallLike(session));

  const fetchCalls = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      if (!client || fetchInFlightRef.current) return;

      const now = Date.now();
      const silent = options?.silent ?? hasLoadedRef.current;

      if (!options?.force) {
        const throttleMs = silent ? LIVE_HOME_POLL_MS : MANUAL_REFRESH_COOLDOWN_MS;
        if (
          hasLoadedRef.current &&
          now - lastFetchAtRef.current < throttleMs
        ) {
          return;
        }
      }

      fetchInFlightRef.current = true;
      if (!silent) {
        if (hasLoadedRef.current) setRefreshing(true);
        else setLoading(true);
      }

      try {
        const sessions = (await fetchActiveLives("audio", true)) as LiveSessionRecord[];
        const visible = sessions.filter(
          (session) => isRoomLive(session) || isSessionEnded(session),
        );
        setCalls(visible);
        hasLoadedRef.current = true;
        lastFetchAtRef.current = Date.now();
        audioCallsCache.clientId = clientId;
        audioCallsCache.calls = visible;
        audioCallsCache.fetchedAt = lastFetchAtRef.current;
        setCached(`audio-home:${clientId}`, visible);
      } catch (e) {
        console.log("fetchActiveLives audio error:", e);
      } finally {
        fetchInFlightRef.current = false;
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [client, clientId],
  );

  React.useEffect(() => {
    const ids = [
      ...new Set(
        calls.map((session) => session.hostClerkId).filter(Boolean) as string[],
      ),
    ];
    if (!ids.length) {
      setHostProfiles({});
      return;
    }
    void syncChatMemberProfiles(ids)
      .then((profiles) => {
        const next: Record<string, string> = {};
        for (const profile of profiles) {
          next[profile.clerkId] = profile.name;
        }
        setHostProfiles(next);
      })
      .catch(() => {});
  }, [calls]);

  const resolveHostName = useCallback(
    (session: LiveSessionRecord) =>
      session.hostName?.trim() ||
      (session.hostClerkId ? hostProfiles[session.hostClerkId] : undefined) ||
      "Host",
    [hostProfiles],
  );

  const refreshCalls = useCallback(() => {
    lastFetchAtRef.current = 0;
    void fetchCalls({ force: true, silent: hasLoadedRef.current });
  }, [fetchCalls]);

  useFocusEffect(
    useCallback(() => {
      const cacheKey = `audio-home:${clientId}`;
      void fetchCalls({
        force: shouldRefetchOnFocus(cacheKey, CACHE_TTL.audioCalls),
        silent: hasLoadedRef.current,
      });

      const poll = setInterval(() => {
        void fetchCalls({ silent: true });
      }, LIVE_HOME_POLL_MS);

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
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void fetchCalls({ force: true, silent: true });
      }
    });
    return () => sub.remove();
  }, [fetchCalls]);

  React.useEffect(() => {
    if (SOCKET_IO_DISABLED_ON_HOST) return;

    const socket = createFeedSocket();
    const unbind = bindLiveSignaling(socket, {
      onStarted: () => {
        void fetchCalls({ force: true, silent: true });
      },
      onEnded: () => {
        void fetchCalls({ force: true, silent: true });
      },
    });

    return () => {
      unbind();
      socket.disconnect();
    };
  }, [fetchCalls]);

  React.useEffect(() => {
    if (!openCreateOnMount) return;
    setModalVisible(true);
    onCreateModalOpened?.();
  }, [openCreateOnMount, onCreateModalOpened]);

  const createRoom = async () => {
    if (!userDetails?.clerkId) return;
    const id = `audio_${currentLevel?.value || "home"}_${userDetails.clerkId}_${Date.now()}`;
    const roomTitle =
      title?.trim() ||
      `${userDetails.nickName || userDetails.firstName || "Host"}'s Room`;

    setModalVisible(false);
    setTitle("");
    lastFetchAtRef.current = 0;
    audioScreen(id, {
      roomTitle,
      level: currentLevel?.value || "home",
      category: categoryLabel,
    });
    void fetchCalls({ force: true, silent: true });
  };

  const activeRooms = useMemo(
    () => calls.filter((session) => isRoomLive(session)),
    [calls],
  );

  const endedRooms = useMemo(
    () => calls.filter((session) => isSessionEnded(session)),
    [calls],
  );

  const listData = audioTab === "live" ? activeRooms : endedRooms;

  const formatEndedAgo = (endedAt?: string) => {
    if (!endedAt) return "Ended recently";
    const ms = Date.now() - new Date(endedAt).getTime();
    if (ms < 60_000) return "Ended just now";
    if (ms < 3_600_000) return `Ended ${Math.max(1, Math.floor(ms / 60_000))}m ago`;
    return `Ended ${Math.max(1, Math.floor(ms / 3_600_000))}h ago`;
  };

  const displayTitle = (session: LiveSessionRecord, ended: boolean) =>
    session.roomTitle ||
    (session.custom as { title?: string } | undefined)?.title ||
    (ended ? "Room ended" : "Audio room");

  const openRoom = (item: LiveSessionRecord) => {
    if (isSessionEnded(item)) return;
    const createdById = item.hostClerkId;
    const me = userDetails?.clerkId;
    const roomTitle = displayTitle(item, false);
    const level = item.level;

    if (createdById && me && createdById === me) {
      audioScreen(item.callId, {
        roomTitle,
        level,
        category:
          (item.custom as { category?: string } | undefined)?.category ||
          categoryLabel,
      });
    } else {
      joinRoom(item.callId, {
        hostClerkId: createdById,
        roomTitle,
      });
    }
  };

  const renderAudioRow = ({ item }: { item: LiveSessionRecord }) => {
    const ended = isSessionEnded(item);
    const titleText = displayTitle(item, ended);
    const host = resolveHostName(item);
    const listeners = item.viewerCount || 0;

    return (
      <Pressable
        style={[styles.liveRow, { backgroundColor: cardBg }, ended && styles.endedRow]}
        onPress={() => openRoom(item)}
        disabled={ended}
        accessibilityRole="button"
        accessibilityLabel={
          ended
            ? `Audio room ended: ${titleText}`
            : `Join audio room: ${titleText} by ${host}`
        }
      >
        <LinearGradient
          colors={
            ended
              ? ["rgba(60,60,60,0.9)", "rgba(40,40,40,0.85)"]
              : [...MediaGradients.audioRoom]
          }
          style={[styles.liveRowThumb, ended && styles.endedThumb]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {ended ? (
            <View style={styles.endedTag}>
              <Text style={styles.endedTagText}>ENDED</Text>
            </View>
          ) : (
            <View style={[styles.livePill, { backgroundColor: AUDIO_ACCENT }]}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
          )}
          {!ended ? (
            <Ionicons name="mic" size={22} color="#fff" style={styles.liveRowPlay} />
          ) : (
            <Ionicons name="mic-off-outline" size={22} color="rgba(255,255,255,0.7)" />
          )}
        </LinearGradient>
        <View style={styles.liveRowBody}>
          <Text style={[styles.liveRowTitle, { color: textMain }]} numberOfLines={1}>
            {titleText}
          </Text>
          <Text style={[styles.liveRowHost, { color: textSub }]} numberOfLines={1}>
            {host}
          </Text>
          {ended ? (
            <Text style={[styles.endedAgo, { color: textSub }]}>
              {formatEndedAgo(item.endedAt)}
            </Text>
          ) : (
            <View style={styles.viewerRow}>
              <Ionicons name="headset" size={13} color={textSub} />
              <Text style={[styles.liveRowViewers, { color: textSub }]}>
                {listeners} listening
              </Text>
            </View>
          )}
        </View>
        {!ended ? (
          <Ionicons name="chevron-forward" size={22} color={textSub} />
        ) : null}
      </Pressable>
    );
  };

  const listHeader =
    audioTab === "live" ? (
      <Pressable style={styles.goLiveBanner} onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={["#7B2FF7", AUDIO_ACCENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.goLiveGradient}
        >
          <View style={styles.goLiveIcon}>
            <Ionicons name="mic" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.goLiveTitle}>Start an audio space</Text>
            <Text style={styles.goLiveSub}>
              Go live in audio and connect in real time
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>
    ) : null;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color={textMain} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textMain }]}>AUDIO</Text>
          <Text style={[styles.headerSub, { color: textSub }]}>
            {currentLevel?.value?.toUpperCase() || "DISCOVER"}
          </Text>
        </View>
        <View style={[styles.timePill, { backgroundColor: civic.actionBar }]}>
          <Text style={[styles.timeText, { color: textSub }]}>
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
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

      <View style={[styles.tabBar, { backgroundColor: cardBg }]}>
        <Pressable
          style={[styles.tab, audioTab === "live" && styles.tabActive]}
          onPress={() => setAudioTab("live")}
        >
          <Text
            style={[
              styles.tabText,
              { color: audioTab === "live" ? "#fff" : textSub },
            ]}
          >
            Live{activeRooms.length ? ` (${activeRooms.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, audioTab === "ended" && styles.tabActive]}
          onPress={() => setAudioTab("ended")}
        >
          <Text
            style={[
              styles.tabText,
              { color: audioTab === "ended" ? "#fff" : textSub },
            ]}
          >
            Ended{endedRooms.length ? ` (${endedRooms.length})` : ""}
          </Text>
        </Pressable>
      </View>

      <FlashList
        data={listData}
        keyExtractor={(item) => item.callId}
        renderItem={renderAudioRow}
        estimatedItemSize={112}
        drawDistance={360}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading && !hasLoadedRef.current ? (
            <ActivityIndicator
              style={{ marginVertical: 32 }}
              color={AUDIO_ACCENT}
            />
          ) : (
            <Text style={[styles.empty, { color: textSub }]}>
              {audioTab === "live"
                ? "No live audio rooms right now. Tap + to start one."
                : "No ended rooms yet."}
            </Text>
          )
        }
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={["#7B2FF7", AUDIO_ACCENT]}
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
                <Text style={[styles.modalTitle, { color: textMain }]}>
                  Create audio space
                </Text>
                <Text style={[styles.modalHint, { color: textSub }]}>
                  Category:{" "}
                  <Text style={{ fontWeight: "800", color: textMain }}>
                    {categoryLabel}
                  </Text>
                </Text>
                <Text style={[styles.modalHint, { color: textSub }]}>
                  Add a title so listeners know what your room is about.
                </Text>
                <TextInput
                  placeholder="Room title"
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
                  <Text style={styles.modalGoText}>Go live in audio</Text>
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
    backgroundColor: AUDIO_ACCENT,
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
  modalHint: { fontSize: 13, marginTop: 8, marginBottom: 8, textAlign: "center" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalGoBtn: {
    backgroundColor: AUDIO_ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalGoText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
