// streamTheme.ts
import { DeepPartial, Theme } from "stream-chat-expo";

export const getStreamTheme = (isDark: boolean): DeepPartial<Theme> => {
  const bg = isDark ? "#0b0b0f" : "#ffffff";
  const surface = isDark ? "#15151c" : "#f2f2f7";
  const text = isDark ? "#ffffff" : "#000000";
  const muted = isDark ? "#9aa0a6" : "#6b7280";
  const primary = "#3797F0"; // Instagram blue

  return {
    colors: {
      white: "#fff",
      black: "#000",
      accent_blue: primary,
      grey: muted,
    },

    // ================= CHANNEL LIST =================
    channelList: {
      container: { backgroundColor: bg },
    },

    channelListMessenger: {
      flatList: { backgroundColor: bg },
      contentContainer: { backgroundColor: bg },
    },

    channelPreview: {
      container: {
        backgroundColor: bg,
        paddingVertical: 10,
        paddingHorizontal: 12,
      },
      title: { color: text, fontWeight: "600" },
      subtitle: { color: muted },
    },

    // ================= MESSAGE LIST =================
    messageList: {
      container: { backgroundColor: bg },
    },

    // ================= MESSAGE BUBBLES (INSTAGRAM STYLE) =================
    messageSimple: {
      content: {
        container: {
          borderRadius: 18,
          paddingVertical: 8,
          paddingHorizontal: 12,
        },
        text: {
          color: text,
          fontSize: 15,
        },
      },
    },

    messageSimpleStatus: {
      container: {
        color: muted,
      },
    },

    // Sent messages (right side)
    messageSimpleRight: {
      content: {
        container: {
          backgroundColor: primary,
          borderBottomRightRadius: 4,
        },
        text: {
          color: "#fff",
        },
      },
    },

    // Received messages (left side)
    messageSimpleLeft: {
      content: {
        container: {
          backgroundColor: surface,
          borderBottomLeftRadius: 4,
        },
        text: {
          color: text,
        },
      },
    },

    // ================= INPUT BAR =================
    messageInput: {
      container: {
        backgroundColor: bg,
        borderTopWidth: 1,
        borderTopColor: isDark ? "#222" : "#e5e7eb",
      },
      inputBox: {
        backgroundColor: surface,
        borderRadius: 22,
        color: text,
        paddingHorizontal: 14,
      },
    },

    // ================= REACTIONS =================
    reactionList: {
      container: {
        backgroundColor: isDark ? "#1c1c24" : "#ffffff",
        borderRadius: 20,
      },
    },
  };
};
