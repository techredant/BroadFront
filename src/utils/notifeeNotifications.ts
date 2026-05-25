import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  EventType,
  type Notification,
} from "@notifee/react-native";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { NOTIFICATION_SOUNDS } from "@/constants/notificationSounds";
import { NOTIFEE_CHANNELS, type NotifeeChannelId } from "@/constants/notificationChannels";
import type { AppNotification } from "@/types/notifications";

export type NotificationPayload = Record<string, string | undefined>;

const chatGroupCounts = new Map<string, number>();
const DEFAULT_VIBRATION_PATTERN = [250, 120, 250, 120];
const BATTERY_PROMPT_KEY = "@broadcast/battery_optimization_prompted";

function asPayload(data: Record<string, unknown> | undefined): NotificationPayload {
  const out: NotificationPayload = {};
  if (!data) return out;
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

export function channelIdFromPayload(
  data: Record<string, unknown> | undefined,
): NotifeeChannelId {
  const screen = data?.screen;
  const category = data?.category;
  const type = data?.type;

  if (screen === "call" || type === "incoming_call") return NOTIFEE_CHANNELS.calls;
  if (screen === "missed_call" || type === "missed_call") return NOTIFEE_CHANNELS.missedCalls;
  if (screen === "chat" || category === "messages") return NOTIFEE_CHANNELS.messages;
  if (screen === "live" || category === "livestreams" || type === "livestream_started") {
    return NOTIFEE_CHANNELS.livestreams;
  }
  if (screen === "follow" || type === "follow") return NOTIFEE_CHANNELS.followers;
  if (category === "marketplace") return NOTIFEE_CHANNELS.marketplace;
  if (category === "system") return NOTIFEE_CHANNELS.system;
  return NOTIFEE_CHANNELS.default;
}

/** Create Android channels (lock screen, heads-up, sounds). */
export async function ensureNotifeeChannels() {
  if (Platform.OS !== "android") return;

  const channels = [
    {
      id: NOTIFEE_CHANNELS.messages,
      name: "Messages",
      importance: AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUNDS.other,
      vibration: true,
    },
    {
      id: NOTIFEE_CHANNELS.calls,
      name: "Calls",
      importance: AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUNDS.incomingCall,
      vibration: true,
      bypassDnd: true,
    },
    {
      id: NOTIFEE_CHANNELS.followers,
      name: "Followers",
      importance: AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUNDS.default,
      vibration: true,
    },
    {
      id: NOTIFEE_CHANNELS.livestreams,
      name: "Livestreams",
      importance: AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUNDS.default,
      vibration: true,
    },
    {
      id: NOTIFEE_CHANNELS.missedCalls,
      name: "Missed calls",
      importance: AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUNDS.other,
      vibration: true,
    },
    {
      id: NOTIFEE_CHANNELS.marketplace,
      name: "Marketplace",
      importance: AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUNDS.other,
      vibration: true,
    },
    {
      id: NOTIFEE_CHANNELS.system,
      name: "System",
      importance: AndroidImportance.HIGH,
      sound: "default",
    },
    {
      id: NOTIFEE_CHANNELS.default,
      name: "BroadCast",
      importance: AndroidImportance.HIGH,
      sound: NOTIFICATION_SOUNDS.default,
    },
  ];

  for (const ch of channels) {
    await notifee.createChannel({
      id: ch.id,
      name: ch.name,
      importance: ch.importance,
      sound: ch.sound,
      vibration: ch.vibration ?? true,
      bypassDnd: ch.bypassDnd === true,
      visibility: AndroidVisibility.PUBLIC,
    });
  }
}

export async function requestNotifeePermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

export async function setBadgeCount(count: number) {
  try {
    await notifee.setBadgeCount(Math.max(0, count));
  } catch {
    /* unsupported */
  }
}

function buildAndroidPressAction(data: NotificationPayload) {
  return {
    id: "default",
    launchActivity: "default",
  };
}

function headsUpAndroidOptions(
  data: NotificationPayload,
  channelId: NotifeeChannelId,
  sound = NOTIFICATION_SOUNDS.default,
) {
  return {
    channelId,
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    category: AndroidCategory.MESSAGE,
    pressAction: buildAndroidPressAction(data),
    sound,
    vibrationPattern: DEFAULT_VIBRATION_PATTERN,
    autoCancel: true,
    showTimestamp: true,
    timestamp: Date.now(),
  };
}

/** WhatsApp-style incoming call: full-screen intent, answer/decline, ringtone. */
export async function displayIncomingCallNotification(params: {
  callId: string;
  title: string;
  body: string;
  callMode?: string;
  callerImage?: string;
  data?: Record<string, unknown>;
}) {
  await ensureNotifeeChannels();

  const data: NotificationPayload = {
    screen: "call",
    category: "calls",
    type: "incoming_call",
    callId: params.callId,
    callMode: params.callMode || "video",
    isCaller: "false",
    ...asPayload(params.data),
  };

  const notification: Notification = {
    id: `call-${params.callId}`,
    title: params.title,
    body: params.body,
    data,
    android: {
      channelId: NOTIFEE_CHANNELS.calls,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      ongoing: true,
      autoCancel: false,
      loopSound: true,
      sound: NOTIFICATION_SOUNDS.incomingCall,
      vibrationPattern: [800, 400, 800, 400],
      fullScreenAction: {
        id: "call_fullscreen",
        launchActivity: "default",
      },
      pressAction: buildAndroidPressAction(data),
      actions: [
        {
          title: "Answer",
          pressAction: { id: "call_answer", launchActivity: "default" },
        },
        {
          title: "Decline",
          pressAction: { id: "call_decline" },
        },
      ],
      ...(params.callerImage
        ? {
            largeIcon: params.callerImage,
            style: {
              type: AndroidStyle.BIGPICTURE,
              picture: params.callerImage,
            },
          }
        : {}),
    },
  };

  await notifee.displayNotification(notification);
}

export async function cancelIncomingCallNotification(callId: string) {
  await notifee.cancelNotification(`call-${callId}`);
}

/** Grouped chat notification (per channel). */
export async function displayChatNotification(params: {
  channelId: string;
  title: string;
  body: string;
  messageId?: string;
  senderId?: string;
  isGroup?: boolean;
  badge?: number;
}) {
  await ensureNotifeeChannels();

  const groupId = `chat-${params.channelId}`;
  const count = (chatGroupCounts.get(groupId) || 0) + 1;
  chatGroupCounts.set(groupId, count);

  const data: NotificationPayload = {
    screen: "chat",
    category: "messages",
    type: params.isGroup ? "group_message" : "message",
    channelId: params.channelId,
    authorId: params.senderId,
  };

  await notifee.displayNotification({
    id: params.messageId || `${groupId}-${Date.now()}`,
    title: params.title,
    body: params.body,
    data,
    android: {
      ...headsUpAndroidOptions(
        data,
        NOTIFEE_CHANNELS.messages,
        NOTIFICATION_SOUNDS.other,
      ),
      channelId: NOTIFEE_CHANNELS.messages,
      groupId,
      groupSummary: false,
    },
  });

  if (count > 1) {
    await notifee.displayNotification({
      id: `${groupId}-summary`,
      title: params.title,
      body: `${count} new messages`,
      data: { ...data, groupSummary: "true" },
      android: {
        ...headsUpAndroidOptions(
          data,
          NOTIFEE_CHANNELS.messages,
          NOTIFICATION_SOUNDS.other,
        ),
        channelId: NOTIFEE_CHANNELS.messages,
        groupId,
        groupSummary: true,
      },
    });
  }

  if (typeof params.badge === "number") {
    await setBadgeCount(params.badge);
  }
}

export async function displayActivityNotification(
  notification: AppNotification,
  badge?: number,
) {
  await ensureNotifeeChannels();

  const data = asPayload({
    ...(notification.data ?? {}),
    type: notification.type,
    category: notification.category,
    notificationId: notification._id,
    entityId: notification.entityId,
    postId: notification.data?.postId ?? notification.entityId,
    authorId: notification.data?.authorId ?? notification.actor?.userId,
    screen:
      notification.data?.screen ??
      (notification.type === "follow"
        ? "follow"
        : notification.type === "message" ||
            notification.type === "group_message"
          ? "chat"
          : "activity"),
  });

  const channelId = channelIdFromPayload(data);

  await notifee.displayNotification({
    id: notification._id || `activity-${Date.now()}`,
    title: notification.title || "BroadCast",
    body: notification.body || "",
    data,
    android: {
      ...headsUpAndroidOptions(
        data,
        channelId,
        channelId === NOTIFEE_CHANNELS.messages
          ? NOTIFICATION_SOUNDS.other
          : NOTIFICATION_SOUNDS.default,
      ),
      sound:
        channelId === NOTIFEE_CHANNELS.messages
          ? NOTIFICATION_SOUNDS.other
          : NOTIFICATION_SOUNDS.default,
    },
  });

  if (typeof badge === "number") {
    await setBadgeCount(badge);
  }
}

export async function displayFcmRemoteMessage(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) {
  const data = asPayload(
    (remoteMessage.data as Record<string, unknown>) || {},
  );
  const title =
    remoteMessage.notification?.title || data.title || "BroadCast";
  const body =
    remoteMessage.notification?.body || data.body || "";

  if (data.screen === "call" && data.callId) {
    await displayIncomingCallNotification({
      callId: data.callId,
      title,
      body,
      callMode: data.callMode,
      callerImage: data.actorImage,
      data,
    });
    return;
  }

  if (data.screen === "chat" && data.channelId) {
    await displayChatNotification({
      channelId: data.channelId,
      title,
      body,
      messageId: data.notificationId,
      senderId: data.authorId,
      isGroup: data.type === "group_message",
      badge: data.badge ? Number(data.badge) : undefined,
    });
    return;
  }

  const channelId = channelIdFromPayload(data);
  await notifee.displayNotification({
    id: data.notificationId || `fcm-${Date.now()}`,
    title,
    body,
    data,
    android: {
      ...headsUpAndroidOptions(data, channelId),
    },
  });

  if (data.badge) {
    await setBadgeCount(Number(data.badge));
  }
}

export function parseNotifeePressData(
  detail: { notification?: { data?: NotificationPayload } } | undefined,
): NotificationPayload {
  return (detail?.notification?.data ?? {}) as NotificationPayload;
}

export async function handleNotifeePressEvent(
  type: EventType,
  detail: { notification?: Notification; pressAction?: { id?: string } },
  handlers: {
    onNavigate: (data: NotificationPayload) => void;
    onAnswerCall?: (data: NotificationPayload) => void;
    onDeclineCall?: (data: NotificationPayload) => void;
  },
) {
  const data = parseNotifeePressData(detail);
  const actionId = detail.pressAction?.id;

  if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    if (actionId === "call_decline") {
      if (data.callId) await cancelIncomingCallNotification(data.callId);
      handlers.onDeclineCall?.(data);
      return;
    }
    if (actionId === "call_answer" || actionId === "call_fullscreen") {
      handlers.onAnswerCall?.(data);
      return;
    }
    handlers.onNavigate(data);
  }
}

/** Open battery optimization settings (Android Doze / background delivery). */
export async function openBatteryOptimizationSettings() {
  if (Platform.OS !== "android") return;
  try {
    await notifee.openBatteryOptimizationSettings();
  } catch {
    /* ignore */
  }
}

export async function promptBatteryOptimizationSettingsIfNeeded() {
  if (Platform.OS !== "android") return;

  try {
    const alreadyPrompted = await AsyncStorage.getItem(BATTERY_PROMPT_KEY);
    if (alreadyPrompted === "true") return;

    const enabled = await notifee.isBatteryOptimizationEnabled();
    if (!enabled) return;

    await AsyncStorage.setItem(BATTERY_PROMPT_KEY, "true");
    Alert.alert(
      "Keep notifications reliable",
      "Allow BroadCast to run in the background so calls and messages arrive on time.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Open settings",
          onPress: () => {
            void openBatteryOptimizationSettings();
          },
        },
      ],
    );
  } catch {
    /* best effort only */
  }
}

export async function openNotificationSettings() {
  await notifee.openNotificationSettings();
}
