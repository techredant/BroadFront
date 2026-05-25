import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useLevel } from "@/context/LevelContext";
import { useIncomingCallOverlay } from "@/components/notifications/IncomingCallOverlay";
import { usePushNotifications } from "@/utils/usePushNotifications";
import {
  getNotificationData,
  handleNotificationDataRedirect,
} from "@/utils/notificationRouting";
import { isIncomingCallNotification } from "@/utils/callNotifications";
import {
  displayIncomingCallNotification,
  displayChatNotification,
  displayActivityNotification,
} from "@/utils/notifeeNotifications";
import { isChatNotification } from "@/utils/callNotifications";
import {
  consumePendingNotifeeAction,
  registerNotifeeForegroundHandler,
} from "@/utils/notifeeEvents";
import { initializeFcmMessaging } from "@/utils/fcmMessaging";
import type { NotificationPayload } from "@/utils/notifeeNotifications";

function navigateFromPayload(
  router: ReturnType<typeof useRouter>,
  data: NotificationPayload,
) {
  handleNotificationDataRedirect(router, data as Parameters<typeof handleNotificationDataRedirect>[1]);
}

/** Wires FCM/Notifee, push token sync, foreground routing, and call overlay. */
export function NotificationBridge() {
  const router = useRouter();
  const { userDetails } = useLevel();
  const pushUserId = userDetails?.clerkId;
  const { showIncomingCall } = useIncomingCallOverlay();

  usePushNotifications(pushUserId, Boolean(pushUserId));

  useEffect(() => {
    initializeFcmMessaging();

    void consumePendingNotifeeAction().then((pending) => {
      if (!pending) return;
      if (pending.actionId === "call_answer" && pending.data.callId) {
        router.push({
          pathname: "/(drawer)/(stream)/call/[callId]",
          params: {
            callId: String(pending.data.callId),
            isCaller: "false",
            callMode: pending.data.callMode === "audio" ? "audio" : "video",
          },
        } as never);
        return;
      }
      if (pending.actionId !== "call_decline") {
        navigateFromPayload(router, pending.data);
      }
    });

    const notifeeUnsub = registerNotifeeForegroundHandler({
      onNavigate: (data) => navigateFromPayload(router, data),
      onAnswerCall: (data) => {
        if (!data.callId) return;
        router.push({
          pathname: "/(drawer)/(stream)/call/[callId]",
          params: {
            callId: String(data.callId),
            isCaller: "false",
            callMode: data.callMode === "audio" ? "audio" : "video",
          },
        } as never);
      },
      onDeclineCall: () => {},
    });

    const receivedSub = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = getNotificationData(notification);

        if (isIncomingCallNotification(data) && data.callId) {
          const callMode = data.callMode === "audio" ? "audio" : "video";
          if (Platform.OS === "android") {
            await displayIncomingCallNotification({
              callId: String(data.callId),
              title: notification.request.content.title || "Incoming call",
              body: notification.request.content.body || "",
              callMode,
            });
          }
          showIncomingCall({
            callId: String(data.callId),
            callMode,
            callerName: notification.request.content.title || "Incoming call",
          });
          return;
        }

        if (Platform.OS === "android") {
          const title = notification.request.content.title || "BroadCast";
          const body = notification.request.content.body || "";
          if (isChatNotification(data) && data.channelId) {
            await displayChatNotification({
              channelId: data.channelId,
              title,
              body,
              senderId: data.authorId,
              isGroup: data.type === "group_message",
            });
          } else {
            await displayActivityNotification(
              {
                title,
                body,
                type: data.type,
                data: data as never,
              },
              undefined,
            );
          }
        }
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        navigateFromPayload(
          router,
          getNotificationData(response.notification) as NotificationPayload,
        );
      },
    );

    return () => {
      notifeeUnsub();
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router, showIncomingCall]);

  return null;
}

export function openNotificationItem(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown>,
) {
  navigateFromPayload(router, data as NotificationPayload);
}
