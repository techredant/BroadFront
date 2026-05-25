import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const INCOMING_CALL_CHANNEL = "incoming_calls";

export type CallNotificationData = {
  screen?: string;
  callId?: string;
  channelId?: string;
  isCaller?: string;
  url?: string;
};

export function isChatNotification(
  data: Record<string, unknown> | undefined,
): data is CallNotificationData {
  return data?.screen === "chat" && typeof data?.channelId === "string";
}

export function isIncomingCallNotification(
  data: Record<string, unknown> | undefined,
): data is CallNotificationData {
  return data?.screen === "call" && typeof data?.callId === "string";
}

/** High-priority channel + handler so calls alert like WhatsApp (heads-up / sound). */
export async function setupIncomingCallNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as CallNotificationData;
      const isCall = isIncomingCallNotification(data);
      const isChat = isChatNotification(data);
      const useNotifeeOnAndroid = Platform.OS === "android";

      return {
        shouldShowAlert: !useNotifeeOnAndroid,
        shouldPlaySound: !useNotifeeOnAndroid,
        shouldSetBadge: true,
        shouldShowBanner: !useNotifeeOnAndroid,
        shouldShowList: !useNotifeeOnAndroid,
        priority:
          isCall || isChat
            ? Notifications.AndroidNotificationPriority.MAX
            : Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(INCOMING_CALL_CHANNEL, {
      name: "Incoming calls",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 800, 400, 800, 400, 800],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: "default",
      enableVibrate: true,
      enableLights: true,
      lightColor: "#22c55e",
    });
  }
}
