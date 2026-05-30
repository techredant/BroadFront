// src/context/LevelSocketContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import io, { Socket } from "socket.io-client";

const BASE_URL = "https://cast-api-zeta.vercel.app";

const SocketContext = createContext<Socket | null>(null);

export const LevelSocketProvider = ({
  children,
  currentLevel,
}: {
  children: ReactNode;
  currentLevel: { type: string; value: string } | null;
}) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!currentLevel?.type || !currentLevel?.value) return;

    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    const room = `level-${currentLevel.type}-${currentLevel.value}`;
    socket.emit("joinRoom", room);

    return () => {
      socket.emit("leaveRoom", room);
      socket.disconnect();
    };
  }, [currentLevel]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useLevelSocket = () => useContext(SocketContext);
