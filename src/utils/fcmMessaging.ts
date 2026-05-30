import { Platform, PermissionsAndroid } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  getMessaging,
  getToken as getMessagingToken,
  onMessage,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import {
  displayFcmRemoteMessage,
  ensureNotifeeChannels,
  requestNotifeePermission,
} from "@/utils/notifeeNotifications";

let initialized = false;
let fcmPermissionResolved = false;
let cachedFcmToken: string | null = null;
let tokenFetchInFlight: Promise<string | null> | null = null;

function firebaseMessaging() {
  return getMessaging(getApp());
}

/** Android 13+ runtime permission (API 33). */
export async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  if (Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  return requestNotifeePermission();
}

async function ensureFcmPermission(): Promise<boolean> {
  if (fcmPermissionResolved) return true;

  try {
    const authStatus = await requestPermission(firebaseMessaging());
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled && Platform.OS === "ios") {
      return false;
    }

    if (Platform.OS === "android") {
      const ok = await requestAndroidNotificationPermission();
      if (!ok) return false;
    }

    fcmPermissionResolved = true;
    return true;
  } catch (err) {
    console.warn("[FCM] requestPermission failed:", err);
    return false;
  }
}

export async function getFcmToken(options?: {
  force?: boolean;
}): Promise<string | null> {
  if (Platform.OS === "web") return null;

  if (!options?.force && cachedFcmToken) {
    return cachedFcmToken;
  }

  if (tokenFetchInFlight) {
    return tokenFetchInFlight;
  }

  tokenFetchInFlight = (async () => {
    try {
      const permitted = await ensureFcmPermission();
      if (!permitted) return null;

      await ensureNotifeeChannels();
      const token = await getMessagingToken(firebaseMessaging());
      cachedFcmToken = token || null;
      return cachedFcmToken;
    } catch (err) {
      console.warn("[FCM] getToken failed:", err);
      return null;
    } finally {
      tokenFetchInFlight = null;
    }
  })();

  return tokenFetchInFlight;
}

export function clearFcmTokenCache() {
  cachedFcmToken = null;
  tokenFetchInFlight = null;
}

let fcmRefreshUnsub: (() => void) | null = null;
const fcmRefreshListeners = new Set<(token: string) => void>();

export function subscribeFcmTokenRefresh(
  onToken: (token: string) => void,
): () => void {
  fcmRefreshListeners.add(onToken);

  if (!fcmRefreshUnsub) {
    fcmRefreshUnsub = onTokenRefresh(firebaseMessaging(), (token) => {
      cachedFcmToken = token;
      for (const listener of fcmRefreshListeners) {
        listener(token);
      }
    });
  }

  return () => {
    fcmRefreshListeners.delete(onToken);
    if (fcmRefreshListeners.size === 0) {
      fcmRefreshUnsub?.();
      fcmRefreshUnsub = null;
    }
  };
}

export function initializeFcmMessaging(handlers?: {
  onForegroundMessage?: (message: unknown) => void;
}) {
  if (initialized) return;
  initialized = true;

  void ensureNotifeeChannels();

  onMessage(firebaseMessaging(), async (remoteMessage) => {
    await displayFcmRemoteMessage(remoteMessage);
    handlers?.onForegroundMessage?.(remoteMessage);
  });
}

/** Call from index.js before expo-router entry (background/killed). */
export function registerFcmBackgroundHandler() {
  setBackgroundMessageHandler(firebaseMessaging(), async (remoteMessage) => {
    await displayFcmRemoteMessage(remoteMessage);
  });
}
