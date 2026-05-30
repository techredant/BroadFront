import { useTheme } from "@/context/ThemeContext";
import { useComposerKeyboardInset } from "@/hooks/useComposerKeyboardInset";
import { Platform } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageInput } from "stream-chat-expo";

type Props = React.ComponentProps<typeof MessageInput>;

/**
 * Keeps the composer above the system navigation bar when the keyboard is closed,
 * and removes bottom padding when the keyboard is open (Stream shifts the layout).
 */
export function ChatMessageInput(props: Props) {
  const { additionalTextInputProps, ...messageInputProps } = props;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 48 : 8);
  const { composerStyle } = useComposerKeyboardInset(bottomInset);

  return (
    <Animated.View
      style={[
        composerStyle,
        {
          paddingTop: 6,
          paddingHorizontal: 8,
          backgroundColor: theme.background,
        },
      ]}
    >
      <MessageInput
        {...messageInputProps}
        additionalTextInputProps={{
          placeholder: "Message...",
          multiline: true,
          ...additionalTextInputProps,
        }}
      />
    </Animated.View>
  );
}
