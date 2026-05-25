import { resolveProductId } from "@/utils/streamProduct";
import { resolveStoryUserId, viewerPathForStoryUser } from "@/utils/streamStory";
import { useRouter } from "expo-router";
import { useMessageContext } from "stream-chat-expo";
import type { MessageTextProps } from "stream-chat-expo";

/** Message body — product cards hide duplicate text; story replies open Viewer on tap. */
export function ChatMessageText(props: MessageTextProps) {
  const { message } = useMessageContext();
  const router = useRouter();
  const storyUserId = resolveStoryUserId(message);

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
    onPress: (param) => {
      if (storyUserId && !props.preventPress) {
        router.push(viewerPathForStoryUser(storyUserId));
        return;
      }
      props.onPress?.(param);
    },
    preventPress: props.preventPress,
  });
}
