import { useUser } from "@clerk/clerk-expo";
import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
} from "react";
import { io, type Socket } from "socket.io-client";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://cast-api-zeta.vercel.app";

export type AppNotification = {
  type?: string;
  title?: string;
  body?: string;
  actor?: { userId?: string; name?: string; image?: string };
  entityId?: string;
  postId?: string;
  callId?: string;
  authorId?: string;
  createdAt?: string;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
};

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    const clerkId = user?.id;
    if (!clerkId) return;

    const socket: Socket = io(BASE_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("join", clerkId);
    });

    socket.on("newNotification", (data: AppNotification) => {
      setNotifications((prev) => [data, ...prev].slice(0, 100));
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.off("newNotification");
      socket.disconnect();
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead }}
    >
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
