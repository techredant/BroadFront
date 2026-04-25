import { useMemo } from "react";
import { isLocalUrl, mergeThemes, Message, MessageProps, ThemeProvider, useTheme } from "stream-chat-expo";

export const CustomMessage = (props: MessageProps) => {
  const { theme } = useTheme();
  const { message } = props;
  const isFromBot = message.ai_generated;
  const hasPendingAttachments = useMemo(
    () =>
      (message.attachments ?? []).some(
        (attachment) =>
          (attachment.image_url && isLocalUrl(attachment.image_url)) ||
          (attachment.asset_url && isLocalUrl(attachment.asset_url)),
      ),
    [message.attachments],
  );

  const modifiedTheme = useMemo(
    () =>
      mergeThemes({
        theme,
        style: {
          messageSimple: isFromBot
            ? {
                content: {
                  containerInner: {
                    backgroundColor: "transparent",
                    borderRadius: 0,
                    borderColor: "transparent",
                  },
                },
              }
            : {
                wrapper: {
                  opacity: hasPendingAttachments ? 0.5 : 1,
                },
              },
        },
      }),
    [theme, isFromBot, hasPendingAttachments],
  );

  return (
    <ThemeProvider mergedStyle={modifiedTheme}>
      <Message {...props} preventPress={true} />
    </ThemeProvider>
  );
};
