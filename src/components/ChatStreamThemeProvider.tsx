import { chatWallpaperStreamThemeStyle } from "@/lib/theme";
import { useMemo, type ReactNode } from "react";
import {
  mergeThemes,
  ThemeProvider as StreamThemeProvider,
  useTheme as useStreamChatTheme,
} from "stream-chat-expo";

/** Nested Stream theme so empty message lists show the chat wallpaper. */
export function ChatStreamThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useStreamChatTheme();
  const wallpaperTheme = useMemo(
    () => mergeThemes({ theme, style: chatWallpaperStreamThemeStyle() }),
    [theme],
  );

  return (
    <StreamThemeProvider theme={wallpaperTheme}>{children}</StreamThemeProvider>
  );
}
