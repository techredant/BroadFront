/**
 * FCM + Notifee must register background handlers before expo-router entry.
 * Incoming calls are delivered via backend push + Socket.io (Agora RTC).
 */
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import { displayFcmRemoteMessage } from "./src/utils/notifeeNotifications";
import { registerNotifeeBackgroundHandler } from "./src/utils/notifeeEvents";

setBackgroundMessageHandler(getMessaging(getApp()), async (remoteMessage) => {
  await displayFcmRemoteMessage(remoteMessage);
});

registerNotifeeBackgroundHandler();

import "./src/utils/notification";

import "expo-router/entry";
