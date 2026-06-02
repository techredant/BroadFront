import { Platform } from "react-native";
import Constants from "expo-constants";

const BACKEND_PORT = 3000;

function getExpoDevMachineHost(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.linkingUri ??
    Constants.experienceUrl;
  if (!hostUri || typeof hostUri !== "string") return undefined;

  try {
    const url = new URL(hostUri);
    return url.hostname || undefined;
  } catch {
    const match = hostUri.match(/(?:exp\/\/|https?:\/\/)([^:/]+)/);
    return match?.[1];
  }
}

function resolveDevApiUrl(): string | undefined {
  if (typeof __DEV__ === "undefined" || !__DEV__) return undefined;
  if (process.env.EXPO_PUBLIC_USE_LOCAL_API === "false") return undefined;

  const explicit = process.env.EXPO_PUBLIC_API_URL_DEV?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // USB: run `adb reverse tcp:3000 tcp:3000` then set EXPO_PUBLIC_USE_USB_API=true
  if (process.env.EXPO_PUBLIC_USE_USB_API === "true") {
    return `http://127.0.0.1:${BACKEND_PORT}`;
  }

  const expoHost = getExpoDevMachineHost();
  if (expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
    return `http://${expoHost}:${BACKEND_PORT}`;
  }

  if (process.env.EXPO_PUBLIC_USE_LOCAL_API === "true") {
    if (Platform.OS === "android") return `http://10.0.2.2:${BACKEND_PORT}`;
    return `http://127.0.0.1:${BACKEND_PORT}`;
  }

  return undefined;
}

/** Hosted REST API (Vercel) — used in production and when local backend is off. */
export const HOSTED_API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://cast-api-zeta.vercel.app"
).replace(/\/$/, "");

export const IS_LOCAL_API = Boolean(resolveDevApiUrl());

/** Public API base — must be HTTPS for Play Store / release builds (no cleartext). */
export const API_PUBLIC_URL = (
  resolveDevApiUrl() ?? HOSTED_API_URL
).replace(/\/$/, "");

export const SOCKET_IO_URL = (
  process.env.EXPO_PUBLIC_SOCKET_URL?.trim() || API_PUBLIC_URL
).replace(/\/$/, "");

/** Socket.IO cannot run on Vercel serverless — true when using hosted API without local backend. */
export const SOCKET_IO_DISABLED_ON_HOST =
  !IS_LOCAL_API && HOSTED_API_URL.includes("vercel");

/** Poll interval when live sockets are unavailable (hosted API). */
export const HOSTED_FEED_REFRESH_MS = 6000;

/** Faster poll for live comments/likes/gifts on Vercel (no Socket.IO). */
export const HOSTED_LIVE_POLL_MS = 2500;

/** Live home list refresh interval (live ↔ ended tabs). */
export const LIVE_HOME_POLL_MS = 5000;
