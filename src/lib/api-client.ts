import axios from "axios";
import {
  API_PUBLIC_URL,
  IS_LOCAL_API,
  SOCKET_IO_DISABLED_ON_HOST,
} from "@/constants/api";

/** Shared HTTP client — use instead of hardcoded API URLs across the app. */
export const apiClient = axios.create({
  baseURL: API_PUBLIC_URL,
  /** Posts with media upload can be slow on device → PC */
  timeout: 120000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      typeof __DEV__ !== "undefined" &&
      __DEV__ &&
      IS_LOCAL_API &&
      error?.message === "Network Error"
    ) {
      console.error(
        "[API] Cannot reach local backend at",
        API_PUBLIC_URL,
        "— run: cd backend && npm run dev",
        "| USB: adb reverse tcp:3000 tcp:3000 + EXPO_PUBLIC_USE_USB_API=true",
        "| Or allow Node.js through Windows Firewall (port 3000)",
      );
    }
    return Promise.reject(error);
  },
);

if (typeof __DEV__ !== "undefined" && __DEV__) {
  console.log(
    "[API] baseURL:",
    API_PUBLIC_URL,
    IS_LOCAL_API ? "(local backend)" : "(hosted)",
  );
}

export { API_PUBLIC_URL, IS_LOCAL_API, SOCKET_IO_DISABLED_ON_HOST };
