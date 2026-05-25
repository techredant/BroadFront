import { Dimensions, Platform } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/** TikTok Live layout tokens */
export const TT = {
  screenW: SCREEN_W,
  screenH: SCREEN_H,
  /** Comment list height (idle) */
  chatHeight: Math.round(SCREEN_H * 0.3),
  /** Extra height when keyboard open */
  chatHeightKeyboard: Math.round(SCREEN_H * 0.24),
  /** Right action rail */
  railRight: 8,
  railBottom: 168,
  railBtn: 44,
  railGap: 18,
  /** Chat + input leave space for rail */
  dockRightInset: 56,
  dockLeft: 12,
  /** Guest circles under top bar */
  guestTop: 56,
  guestSize: 56,
  /** Floating hearts spawn from right */
  reactionSpawnX: SCREEN_W - 72,
  liveRed: "#FE2C55",
  pillBg: "rgba(0,0,0,0.35)",
  inputBg: "rgba(255,255,255,0.18)",
} as const;

export const ttKeyboardBottom = (height: number, open: boolean) =>
  open ? (Platform.OS === "ios" ? height : 0) : 0;
