import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { sendPresenceHeartbeat } from "@/services/presenceApi";

const HEARTBEAT_MS = 25_000;

/** REST heartbeat — works on Vercel (no Socket.IO required). */
export function usePresenceHeartbeat(userId?: string | null) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const beat = () => {
      if (appState.current !== "active") return;
      void sendPresenceHeartbeat(userId).catch(() => {});
    };

    beat();
    interval = setInterval(beat, HEARTBEAT_MS);

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      appState.current = next;
      if (next === "active") beat();
    });

    return () => {
      if (interval) clearInterval(interval);
      sub.remove();
    };
  }, [userId]);
}
