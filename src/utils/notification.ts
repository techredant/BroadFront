import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { setupIncomingCallNotifications } from "@/utils/callNotifications";
import { NOTIFEE_CHANNELS } from "@/constants/notificationChannels";
import { NOTIFICATION_SOUNDS } from "@/constants/notificationSounds";

const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  "e693fdcd-e810-4cf4-ae07-e5218d8032c1";

void setupIncomingCallNotifications();

let channelsReady = false;

/** Android channels only — no permission dialog. */
export async function ensureNotificationChannels() {
  if (channelsReady || Platform.OS !== "android") {
    channelsReady = true;
    return;
  }

  await Notifications.setNotificationChannelAsync(NOTIFEE_CHANNELS.default, {
    name: "BroadCast",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [250, 250, 250, 250],
    sound: NOTIFICATION_SOUNDS.default,
  });

  await Notifications.setNotificationChannelAsync(NOTIFEE_CHANNELS.messages, {
    name: "Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [250, 250, 250, 250],
    sound: NOTIFICATION_SOUNDS.other,
  });

  await Notifications.setNotificationChannelAsync(NOTIFEE_CHANNELS.calls, {
    name: "Incoming calls",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [800, 400, 800, 400],
    bypassDnd: true,
    sound: NOTIFICATION_SOUNDS.incomingCall,
  });

  await Notifications.setNotificationChannelAsync(NOTIFEE_CHANNELS.missedCalls, {
    name: "Missed calls",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [500, 250, 500, 250],
    sound: NOTIFICATION_SOUNDS.other,
  });

  await Notifications.setNotificationChannelAsync(NOTIFEE_CHANNELS.followers, {
    name: "Followers",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [250, 250, 250, 250],
    sound: NOTIFICATION_SOUNDS.default,
  });

  await Notifications.setNotificationChannelAsync(NOTIFEE_CHANNELS.livestreams, {
    name: "Livestreams",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [250, 250, 250, 250],
    sound: NOTIFICATION_SOUNDS.default,
  });

  channelsReady = true;
}

/** Request permission + return Expo push token (call after user taps Enable). */
export async function requestPushPermissionsAndToken(): Promise<
  string | null
> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device.");
    return null;
  }

  await ensureNotificationChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: EAS_PROJECT_ID,
  });

  return tokenData.data;
}

/** Register token only if permission was already granted (no dialog). */
export async function getPushTokenIfGranted(): Promise<string | null> {
  if (!Device.isDevice) return null;

  await ensureNotificationChannels();

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: EAS_PROJECT_ID,
  });

  return tokenData.data;
}

/** @deprecated Use requestPushPermissionsAndToken after user engagement */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  return requestPushPermissionsAndToken();
}
