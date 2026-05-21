import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { AppState, type AppStateStatus } from "react-native";
import { getPushTokenIfGranted } from "@/utils/notification";
import { API_PUBLIC_URL } from "@/constants/api";

async function savePushToken(userId: string, token: string): Promise<boolean> {
  try {
    await axios.post(`${API_PUBLIC_URL}/api/notification-token/token`, {
      userId,
      token,
    });
    return true;
  } catch (err: unknown) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 404) {
      console.warn(
        "Push token not saved yet — user profile may still be syncing.",
      );
    } else {
      console.error("Push token save failed:", err);
    }
    return false;
  }
}

/** Syncs Expo push token when permission is already granted — does not show a dialog. */
export function usePushNotifications(
  userId?: string,
  enabled = true,
) {
  const [registeredFor, setRegisteredFor] = useState<string | null>(null);
  const registeredRef = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    registeredRef.current = registeredFor;
  }, [registeredFor]);

  useEffect(() => {
    if (!userId || !enabled) {
      setRegisteredFor(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const register = async () => {
      if (registeredRef.current === userId) return;

      try {
        const token = await getPushTokenIfGranted();
        if (!token || cancelled) return;

        const ok = await savePushToken(userId, token);
        if (!cancelled && ok) {
          setRegisteredFor(userId);
        }
      } catch (err) {
        console.error("Push token sync failed:", err);
      }
    };

    register();

    const retry = setInterval(() => {
      if (registeredRef.current === userId || attempts >= 5 || cancelled) {
        clearInterval(retry);
        return;
      }
      attempts += 1;
      register();
    }, 15_000);

    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          next === "active"
        ) {
          register();
        }
        appState.current = next;
      },
    );

    return () => {
      cancelled = true;
      clearInterval(retry);
      sub.remove();
    };
  }, [userId, enabled]);

  return { registered: registeredFor === userId };
}
