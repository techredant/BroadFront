import { useUser } from "@clerk/clerk-expo";
import { useEffect, useState, createContext } from "react";
import { io } from "socket.io-client";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(BASE_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("join", user.id);
    });

    socket.on("newNotification", (data) => {
      setNotifications((prev) => [data, ...prev]);
    });

    return () => {
      socket.off("newNotification");
      socket.disconnect();
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
