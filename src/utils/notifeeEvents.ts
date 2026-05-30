import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, { EventType } from "@notifee/react-native";
import {
  cancelIncomingCallNotification,
  handleNotifeePressEvent,
  parseNotifeePressData,
  type NotificationPayload,
} from "@/utils/notifeeNotifications";

const PENDING_NOTIFEE_ACTION_KEY = "@broadcast/pending_notifee_action";

export type PendingNotifeeAction = {
  actionId?: string;
  data: NotificationPayload;
};

export async function storePendingNotifeeAction(
  action: PendingNotifeeAction,
) {
  await AsyncStorage.setItem(
    PENDING_NOTIFEE_ACTION_KEY,
    JSON.stringify(action),
  );
}

export async function consumePendingNotifeeAction(): Promise<PendingNotifeeAction | null> {
  const raw = await AsyncStorage.getItem(PENDING_NOTIFEE_ACTION_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(PENDING_NOTIFEE_ACTION_KEY);
  try {
    return JSON.parse(raw) as PendingNotifeeAction;
  } catch {
    return null;
  }
}

/** Registered in index.js for killed/background tap handling. */
export function registerNotifeeBackgroundHandler() {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    await handleNotifeePressEvent(type, detail, {
      onNavigate: async (data) => {
        await storePendingNotifeeAction({
          actionId: detail.pressAction?.id,
          data,
        });
      },
      onAnswerCall: async (data) => {
        await storePendingNotifeeAction({
          actionId: "call_answer",
          data,
        });
      },
      onDeclineCall: async (data) => {
        if (data.callId) await cancelIncomingCallNotification(data.callId);
        await storePendingNotifeeAction({
          actionId: "call_decline",
          data,
        });
      },
    });
  });
}

export function registerNotifeeForegroundHandler(handlers: {
  onNavigate: (data: NotificationPayload) => void;
  onAnswerCall: (data: NotificationPayload) => void;
  onDeclineCall: (data: NotificationPayload) => void;
}) {
  return notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type === EventType.DISMISSED) {
      const data = parseNotifeePressData(detail);
      if (data.callId) await cancelIncomingCallNotification(data.callId);
      return;
    }

    await handleNotifeePressEvent(type, detail, handlers);
  });
}
