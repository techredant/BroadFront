import { useUser } from "@clerk/clerk-expo";
import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { AppState } from "react-native";
import { io, type Socket } from "socket.io-client";
import type { AppNotification, NotificationSection } from "@/types/notifications";
import { sectionToCategory } from "@/types/notifications";
import {
  deleteNotificationApi,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationApi";
import { presentActivityNotificationInShade } from "@/utils/activityShade";
import { SOCKET_IO_DISABLED_ON_HOST, SOCKET_IO_URL } from "@/constants/api";
import { bindPresenceSocket } from "@/utils/presenceSocket";
import { useActiveLiveHosts } from "@/context/ActiveLiveHostsContext";
import { filterActiveLivestreamNotifications } from "@/utils/livestreamNotifications";

const HOSTED_NOTIFICATION_REFRESH_MS = 8000;

function countUnread(list: AppNotification[]) {
  return list.filter((n) => !n.read).length;
}

function matchesSection(item: AppNotification, section: NotificationSection) {
  if (section === "all") return true;
  if (item.category === section) return true;
  if (
    section === "messages" &&
    ["message", "group_message", "media_message", "voice_note"].includes(
      String(item.type || ""),
    )
  ) {
    return true;
  }
  if (
    section === "livestreams" &&
    ["livestream_started", "live_invite", "live_join_request", "live_reaction"].includes(
      String(item.type || ""),
    )
  ) {
    return true;
  }
  return false;
}

type NotificationContextValue = {
  notifications: AppNotification[];
  filteredNotifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  activeSection: NotificationSection;
  setActiveSection: (section: NotificationSection) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (section?: NotificationSection) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  banner: AppNotification | null;
  dismissBanner: () => void;
};

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const userId = user?.id;
  const { activeLiveCallIds } = useActiveLiveHosts();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [activeSection, setActiveSectionState] =
    useState<NotificationSection>("all");
  const [banner, setBanner] = useState<AppNotification | null>(null);

  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
  const shadeSeenIdsRef = useRef<Set<string>>(new Set());

  const filteredNotifications = useMemo(
    () =>
      filterActiveLivestreamNotifications(
        notifications.filter((n) => matchesSection(n, activeSection)),
        activeLiveCallIds,
      ),
    [notifications, activeSection, activeLiveCallIds],
  );

  const setActiveSection = useCallback((section: NotificationSection) => {
    setActiveSectionState(section);
    setCursor(null);
    setHasMore(true);
  }, []);

  const dismissBanner = useCallback(() => setBanner(null), []);

  const loadPage = useCallback(
    async (replace: boolean, sectionOverride?: NotificationSection) => {
      if (!userId) return;

      const section = sectionOverride ?? activeSectionRef.current;
      const pageCursor = replace ? null : cursor;

      if (replace) {
        setRefreshing(true);
        setNotifications([]);
        setCursor(null);
        setHasMore(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await fetchNotifications({
          userId,
          section,
          cursor: pageCursor,
        });

        const page = result?.notifications ?? [];
        const nextCursor = result?.nextCursor ?? null;

        setUnreadCount(result?.unreadCount ?? countUnread(page));
        for (const item of page) {
          const id = item._id;
          if (id) shadeSeenIdsRef.current.add(id);
        }

        if (replace) {
          setNotifications(page);
        } else {
          setNotifications((prev) => [...prev, ...page]);
        }

        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
      } catch {
        if (replace) {
          setNotifications([]);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, cursor],
  );

  const refresh = useCallback(() => loadPage(true), [loadPage]);
  const changeSection = useCallback(
    (section: NotificationSection) => {
      setActiveSection(section);
      void loadPage(true, section);
    },
    [loadPage, setActiveSection],
  );
  const loadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      return loadPage(false);
    }
    return Promise.resolve();
  }, [loadPage, loading, refreshing, hasMore]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void loadPage(true);
  }, [userId, activeSection]);

  useEffect(() => {
    if (!userId) return;
    void fetchUnreadCount(userId)
      .then((count) => setUnreadCount(count ?? 0))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!SOCKET_IO_DISABLED_ON_HOST || !userId) return;

    let currentAppState = AppState.currentState;
    let refreshingHostedActivity = false;

    const refreshHostedActivity = async () => {
      if (currentAppState !== "active" || refreshingHostedActivity) return;
      refreshingHostedActivity = true;
      try {
        const result = await fetchNotifications({
          userId,
          section: "all",
          limit: 10,
        });
        const page = result?.notifications ?? [];
        setUnreadCount(result?.unreadCount ?? countUnread(page));

        const incomingUnread = page.filter((item) => {
          const id = item._id;
          return id && !item.read && !shadeSeenIdsRef.current.has(id);
        });

        for (const item of page) {
          if (item._id) shadeSeenIdsRef.current.add(item._id);
        }

        if (page.length) {
          setNotifications((prev) => {
            const existing = new Set(prev.map((item) => item._id).filter(Boolean));
            const next = [...page.filter((item) => !existing.has(item._id)), ...prev];
            return next.slice(0, 200);
          });
        }

        for (const item of incomingUnread) {
          void presentActivityNotificationInShade(item).catch((err) => {
            console.warn("Activity shade notification failed:", err);
          });
          setBanner(item);
        }
      } catch {
        /* keep current badge */
      } finally {
        refreshingHostedActivity = false;
      }
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      currentAppState = nextState;
      if (nextState === "active") {
        void refreshHostedActivity();
      }
    });

    const interval = setInterval(() => {
      void refreshHostedActivity();
    }, HOSTED_NOTIFICATION_REFRESH_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [userId]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        const result = await markNotificationRead(userId, id);
        setUnreadCount(result?.unreadCount ?? 0);
      } catch {
        /* keep optimistic update */
      }
    },
    [userId],
  );

  const markAllRead = useCallback(
    async (section?: NotificationSection) => {
      if (!userId) return;
      const sec = section ?? activeSectionRef.current;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      try {
        const result = await markAllNotificationsRead(userId, sec);
        setUnreadCount(result?.unreadCount ?? 0);
        void refresh();
      } catch {
        /* ignore */
      }
    },
    [userId, refresh],
  );

  const removeNotification = useCallback(
    async (id: string) => {
      if (!userId) return;
      setNotifications((prev) => {
        const next = prev.filter((n) => n._id !== id);
        setUnreadCount(countUnread(next));
        return next;
      });
      try {
        const result = await deleteNotificationApi(userId, id);
        setUnreadCount(result?.unreadCount ?? 0);
      } catch {
        /* ignore */
      }
    },
    [userId],
  );

  useEffect(() => {
    const clerkId = userId;
    if (!clerkId) return;
    if (SOCKET_IO_DISABLED_ON_HOST) return;

    const socket: Socket = io(SOCKET_IO_URL, {
      transports: ["polling", "websocket"],
    });

    const unbindPresence = bindPresenceSocket(socket, clerkId);

    socket.on("newNotification", (data: AppNotification) => {
      void presentActivityNotificationInShade(data).catch((err) => {
        console.warn("Activity shade notification failed:", err);
      });

      const section = activeSectionRef.current;
      const category = sectionToCategory(section);
      if (category && data.category && data.category !== category) {
        setUnreadCount((c) => c + 1);
        setBanner(data);
        return;
      }

      setNotifications((prev) => {
        const id = data._id;
        if (id) {
          const idx = prev.findIndex((n) => n._id === id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...data };
            return next;
          }
        }
        return [data, ...prev].slice(0, 200);
      });
      setUnreadCount((c) => c + 1);
      setBanner(data);
    });

    return () => {
      socket.off("newNotification");
      unbindPresence();
      socket.disconnect();
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      notifications,
      filteredNotifications,
      unreadCount,
      loading,
      refreshing,
      hasMore,
      activeSection,
      setActiveSection: changeSection,
      refresh,
      loadMore,
      markRead,
      markAllRead,
      removeNotification,
      banner,
      dismissBanner,
    }),
    [
      notifications,
      filteredNotifications,
      unreadCount,
      loading,
      refreshing,
      hasMore,
      activeSection,
      changeSection,
      refresh,
      loadMore,
      markRead,
      markAllRead,
      removeNotification,
      banner,
      dismissBanner,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return ctx;
}

export function useNotificationBadge() {
  return useNotifications().unreadCount;
}
