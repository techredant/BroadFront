import { useTheme } from "@/context/ThemeContext";
import { useChatBottomInset } from "@/utils/chatLayout";
import { useEffect, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { MessageInput } from "stream-chat-expo";

type Props = React.ComponentProps<typeof MessageInput>;

/**
 * Keeps the composer above the system navigation bar when the keyboard is closed,
 * and removes bottom padding when the keyboard is open (Stream shifts the layout).
 */
export function ChatMessageInput(props: Props) {
  const safeBottom = useChatBottomInset();
  const { theme } = useTheme();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOpen(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Android adjustResize moves the window; only pad for the nav bar when keyboard is closed.
  const bottomPad = keyboardOpen ? 0 : safeBottom;

  return (
    <View
      style={{
        paddingBottom: bottomPad,
        backgroundColor: theme.background,
      }}
    >
      <MessageInput {...props} />
    </View>
  );
}
