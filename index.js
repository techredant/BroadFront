/**
 * Stream Video push/calling must be configured before the React tree mounts.
 * FCM + Notifee must register background handlers before expo-router entry.
 */
import { StreamVideoClient, StreamVideoRN } from "@stream-io/video-react-native-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import { displayFcmRemoteMessage } from "./src/utils/notifeeNotifications";
import { registerNotifeeBackgroundHandler } from "./src/utils/notifeeEvents";

const STREAM_USER_KEY = "@broadcast/stream_push_user";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY;

const STREAM_ANDROID_PUSH_PROVIDER =
  process.env.EXPO_PUBLIC_STREAM_ANDROID_PUSH_PROVIDER;
const STREAM_IOS_PUSH_PROVIDER =
  process.env.EXPO_PUBLIC_STREAM_IOS_PUSH_PROVIDER;

async function createStreamVideoClientFromCache() {
  const raw = await AsyncStorage.getItem(STREAM_USER_KEY);
  if (!raw) {
    throw new Error("No Stream user cached for push recovery");
  }
  const user = JSON.parse(raw);
  return StreamVideoClient.getOrCreateInstance({
    apiKey,
    user: {
      id: user.id,
      name: user.name ?? user.id,
      image: user.image,
    },
    tokenProvider: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/stream/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            name: user.name,
            image: user.image,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.token) {
        throw new Error(data?.error ?? "Stream token fetch failed");
      }
      return data.token;
    },
  });
}

if (apiKey && (STREAM_ANDROID_PUSH_PROVIDER || STREAM_IOS_PUSH_PROVIDER)) {
  try {
    StreamVideoRN.setPushConfig({
      isExpo: true,
      ...(STREAM_IOS_PUSH_PROVIDER && {
        ios: {
          pushProviderName: STREAM_IOS_PUSH_PROVIDER,
        },
      }),
      ...(STREAM_ANDROID_PUSH_PROVIDER && {
        android: {
          pushProviderName: STREAM_ANDROID_PUSH_PROVIDER,
          incomingChannel: {
            id: "stream_incoming_call",
            name: "Incoming call notifications",
            vibration: true,
          },
          titleTransformer: (createdUserName, incoming) =>
            incoming
              ? `Incoming call from ${createdUserName}`
              : `Calling ${createdUserName}`,
          notificationTexts: {
            accepting: "Connecting…",
            rejecting: "Declining…",
          },
        },
      }),
      createStreamVideoClient: createStreamVideoClientFromCache,
    });
  } catch (err) {
    console.warn("[Stream] setPushConfig failed:", err);
  }
}

/** FCM: display via Notifee when app is killed or backgrounded. */
setBackgroundMessageHandler(getMessaging(getApp()), async (remoteMessage) => {
  await displayFcmRemoteMessage(remoteMessage);
});

registerNotifeeBackgroundHandler();

import "./src/utils/notification";

import "expo-router/entry";
