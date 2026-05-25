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

function countUnread(list: AppNotification[]) {
  return list.filter((n) => !n.read).length;
}

function matchesSection(item: AppNotification, section: NotificationSection) {
  if (section === "all") return true;
  return item.category === section;
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

  const filteredNotifications = useMemo(
    () => notifications.filter((n) => matchesSection(n, activeSection)),
    [notifications, activeSection],
  );

  const setActiveSection = useCallback((section: NotificationSection) => {
    setActiveSectionState(section);
    setCursor(null);
    setHasMore(true);
  }, []);

  const dismissBanner = useCallback(() => setBanner(null), []);

  const loadPage = useCallback(
    async (replace: boolean) => {
      if (!userId) return;

      const section = activeSectionRef.current;
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

    socket.on("connect", () => {
      socket.emit("join", clerkId);
    });

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
      setActiveSection,
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
      setActiveSection,
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
