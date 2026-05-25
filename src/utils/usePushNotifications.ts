import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { AppState, Platform, type AppStateStatus } from "react-native";
import * as Device from "expo-device";
import { getPushTokenIfGranted } from "@/utils/notification";
import { getFcmToken, subscribeFcmTokenRefresh } from "@/utils/fcmMessaging";
import { API_PUBLIC_URL } from "@/constants/api";
import { promptBatteryOptimizationSettingsIfNeeded } from "@/utils/notifeeNotifications";

export async function savePushToken(
  userId: string,
  token: string,
): Promise<boolean> {
  try {
    const fcmToken = await getFcmToken();

    await axios.post(
      `${API_PUBLIC_URL}/api/notification-token/device/register`,
      {
        userId,
        deviceId:
          Device.osInternalBuildId ||
          Device.osBuildId ||
          `${Platform.OS}-${userId}`,
        token,
        fcmToken,
        platform: Platform.OS,
        osVersion: Device.osVersion,
        deviceName: Device.deviceName,
      },
      { timeout: 10_000 },
    );
    return true;
  } catch (err: unknown) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 404) {
      console.warn(
        "Push token not saved yet — user profile may still be syncing.",
      );
    } else if (axios.isAxiosError(err) && err.message === "Network Error") {
      console.warn(
        `Push token save failed: cannot reach ${API_PUBLIC_URL}. Check that the phone and backend are on the same network, or use USB reverse/proxy.`,
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

    const register = async (force = false) => {
      if (!force && registeredRef.current === userId) return;

      try {
        const token = await getPushTokenIfGranted();
        if (!token || cancelled) return;

        const ok = await savePushToken(userId, token);
        if (!cancelled && ok) {
          setRegisteredFor(userId);
          void promptBatteryOptimizationSettingsIfNeeded();
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
    const unsubscribeFcmRefresh = subscribeFcmTokenRefresh(() => {
      void register(true);
    });

    return () => {
      cancelled = true;
      clearInterval(retry);
      sub.remove();
      unsubscribeFcmRefresh();
    };
  }, [userId, enabled]);

  return { registered: registeredFor === userId };
}
