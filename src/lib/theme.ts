// Stream Chat theme — must be passed as OverlayProvider value={{ style: ... }}
import type { DeepPartial, Theme } from "stream-chat-expo";

type AppTheme = {
  background: string;
  text: string;
  card: string;
  border: string;
  primary: string;
  subtext: string;
};

export const getStreamTheme = (
  isDark: boolean,
  app?: AppTheme,
): DeepPartial<Theme> => {
  const bg = app?.background ?? (isDark ? "#000000" : "#ffffff");
  const surface = app?.card ?? (isDark ? "#111111" : "#f2f2f7");
  const text = app?.text ?? (isDark ? "#ffffff" : "#000000");
  const muted = app?.subtext ?? (isDark ? "#aaaaaa" : "#6b7280");
  const primary = app?.primary ?? (isDark ? "#0A84FF" : "#3797F0");
  const borderColor =
    app?.border ?? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");

  const senderBubble = app?.card ?? surface;
  const receiverBubble = isDark ? "#1F2C34" : "#FFFFFF";
  const linkColor = isDark ? "#6eb6ff" : primary;

  return {
    colors: {
      accent_blue: primary,
      accent_dark_blue: primary,
      accent_green: "#20E070",
      accent_red: "#FF3742",
      // Markdown + labels read `black`; map to readable text on bubbles
      black: text,
      white: "#ffffff",
      white_snow: bg,
      white_smoke: surface,
      grey: muted,
      grey_dark: muted,
      grey_gainsboro: borderColor,
      grey_whisper: isDark ? "#1a1a1a" : "#ECEBEB",
      text_high_emphasis: text,
      text_low_emphasis: muted,
      border: borderColor,
      bg_gradient_start: bg,
      bg_gradient_end: bg,
      bg_user: surface,
      icon_background: surface,
      // Bubble fallbacks used by MessageSimple when custom bg colors are unset
      light_blue: senderBubble,
      light_gray: receiverBubble,
      blue_alice: isDark ? "#1a2a3a" : "#E9F2FF",
      code_block: isDark ? "#2a2a32" : "#DDDDDD",
      static_black: "#000000",
      static_white: "#ffffff",
      overlay: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)",
      targetedMessageBackground: isDark ? "#1a1a22" : "#FBF4DD",
    },

    channelListMessenger: {
      flatList: { backgroundColor: bg },
      flatListContent: { backgroundColor: bg },
    },

    channelListSkeleton: {
      background: { backgroundColor: surface },
      maskFillColor: bg,
    },

    channelPreview: {
      container: {
        backgroundColor: bg,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
      },
      contentContainer: { backgroundColor: bg },
      row: { backgroundColor: bg },
      title: { color: text, fontWeight: "600", fontSize: 14 },
      date: { color: muted, fontSize: 11 },
      message: { container: { backgroundColor: bg } },
      unreadText: { color: "#ffffff" },
    },

    messagePreview: {
      message: { color: muted },
    },

    messageList: {
      container: { backgroundColor: "transparent" },
      listContainer: { backgroundColor: "transparent" },
    },

    messageSimple: {
      content: {
        senderMessageBackgroundColor: senderBubble,
        receiverMessageBackgroundColor: receiverBubble,
        container: {
          borderRadius: 18,
          paddingVertical: 0,
          paddingHorizontal: 0,
        },
        containerInner: {
          overflow: "hidden",
          alignSelf: "flex-start",
        },
        wrapper: {
          alignSelf: "flex-start",
        },
        textContainer: {
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: "transparent",
        },
        markdown: {
          text: { color: text },
          autolink: { color: linkColor },
          mentions: { color: linkColor },
          blockQuoteText: { color: text },
          codeBlock: {
            backgroundColor: isDark ? "#2a2a32" : "#DDDDDD",
            color: text,
          },
          inlineCode: {
            backgroundColor: isDark ? "#1e1e26" : surface,
            borderColor: borderColor,
            color: isDark ? "#ff9f9f" : "#FF3742",
          },
        },
      },
      gallery: {
        galleryContainer: { overflow: "hidden" },
        imageContainer: { overflow: "hidden" },
        imageContainerStyle: { overflow: "hidden" },
      },
      videoThumbnail: {
        container: { overflow: "hidden" },
      },
    },

    messageSimpleStatus: {
      container: { color: muted },
    },

    messageInput: {
      container: {
        backgroundColor: bg,
        borderTopWidth: 0,
        paddingTop: 6,
        paddingHorizontal: 8,
        paddingBottom: 0,
      },
      composerContainer: {
        backgroundColor: isDark ? "#171717" : "#F3F4F6",
        borderRadius: 26,
        borderWidth: 1,
        borderColor,
        paddingHorizontal: 8,
        minHeight: 48,
        alignItems: "center",
      },
      inputBox: {
        backgroundColor: "transparent",
        borderRadius: 24,
        color: text,
        fontSize: 15,
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxHeight: 110,
      },
      inputBoxContainer: {
        backgroundColor: "transparent",
        borderWidth: 0,
        flex: 1,
      },
      focusedInputBoxContainer: {
        backgroundColor: "transparent",
        borderWidth: 0,
      },
      attachButtonContainer: {
        backgroundColor: "transparent",
      },
      sendButtonContainer: {
        backgroundColor: primary,
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 2,
      },
      sendButton: {
        margin: 0,
      },
      sendUpIcon: {
        pathFill: "#ffffff",
      },
    },

    emptyStateIndicator: {
      channelContainer: { backgroundColor: bg },
      channelTitle: { color: text },
      channelDetails: { color: muted },
      messageContainer: { backgroundColor: "transparent" },
      messageTitle: { color: text },
    },

    dateHeader: {
      container: { backgroundColor: "transparent" },
      text: { color: muted },
    },

    reactionList: {
      container: {
        backgroundColor: isDark ? "#1c1c24" : "#ffffff",
        borderRadius: 20,
      },
    },
  };
};
