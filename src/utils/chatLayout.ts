import { useEffect, useMemo, useState } from "react";
import { Platform, type KeyboardAvoidingViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isOwnUser, type StreamChat } from "stream-chat";

/** Bottom inset for chat composer / attachment picker (system nav bar). */
export function useChatBottomInset() {
  const insets = useSafeAreaInsets();
  if (insets.bottom > 0) return insets.bottom;
  return Platform.OS === "android" ? 48 : 0;
}

/** Stream MessageInput row height (toolbar + text field). */
export const CHAT_COMPOSER_HEIGHT = Platform.OS === "android" ? 60 : 52;

/**
 * Extra lift when keyboard is open: nav bar gap + full composer above keyboard keys.
 */
export function getKeyboardOpenLift(navBarInset: number) {
  return navBarInset + CHAT_COMPOSER_HEIGHT;
}

/**
 * Stream Channel keyboard props (shared by DM, AI, and thread screens).
 * Uses ChatKeyboardCompatibleView — lifts with the keyboard and resets on hide.
 */
export function useStreamChannelLayout(headerHeight: number) {
  const bottomInset = useChatBottomInset();

  return useMemo(
    () => ({
      bottomInset,
      // Android adjustResize already shrinks the window — header offset adds a gap above the keyboard.
      keyboardVerticalOffset:
        Platform.OS === "android" ? 0 : headerHeight,
      keyboardBehavior: "padding" as KeyboardAvoidingViewProps["behavior"],
      additionalKeyboardAvoidingViewProps: {
        keyboardOpenLift: getKeyboardOpenLift(bottomInset),
      },
    }),
    [bottomInset, headerHeight],
  );
}

function readStreamUnread(client: StreamChat | null | undefined) {
  const user = client?.user;
  if (!isOwnUser(user)) return 0;
  return Math.max(0, Math.floor(user.total_unread_count));
}

/** Live Stream Chat unread message count for drawer badges. */
export function useStreamUnreadCount(
  client: StreamChat | null | undefined,
) {
  const [count, setCount] = useState(() => readStreamUnread(client));

  useEffect(() => {
    if (!client) {
      setCount(0);
      return;
    }

    const sync = () => setCount(readStreamUnread(client));
    sync();

    const subs = [
      client.on("notification.message_new", sync),
      client.on("notification.mark_read", sync),
      client.on("notification.message_read", sync),
      client.on("message.read", sync),
      client.on("user.updated", sync),
    ];

    return () => subs.forEach((sub) => sub.unsubscribe());
  }, [client]);

  return count;
}

export function formatDrawerBadge(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}
