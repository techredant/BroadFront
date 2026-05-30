import { resolveProductId } from "@/utils/streamProduct";
import { useMessageContext } from "stream-chat-expo";
import type { MessageTextProps } from "stream-chat-expo";

/** Hides duplicate title/price text when a market product card is shown. */
export function ChatProductMessageText(props: MessageTextProps) {
  const { message } = useMessageContext();

  if (resolveProductId(message)) {
    return null;
  }

  return props.renderText({
    colors: props.theme.theme.colors,
    markdownRules: props.markdownRules,
    markdownStyles: props.markdownStyles,
    message: message,
    messageOverlay: props.messageOverlay,
    messageTextNumberOfLines: props.messageTextNumberOfLines,
    onLongPress: props.onLongPress,
    onlyEmojis: props.onlyEmojis,
    onPress: props.onPress,
    preventPress: props.preventPress,
  });
}
