import { Dimensions, Platform } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/** TikTok Live layout + glassmorphism tokens */
export const TT = {
  screenW: SCREEN_W,
  screenH: SCREEN_H,
  chatHeight: Math.round(SCREEN_H * 0.28),
  chatHeightKeyboard: Math.round(SCREEN_H * 0.22),
  railRight: 10,
  railBottom: 172,
  railBtn: 48,
  railGap: 14,
  dockRightInset: 72,
  dockLeft: 12,
  guestTop: 72,
  guestCardW: 72,
  guestCardH: 96,
  guestMax: 4,
  liveRed: "#FE2C55",
  livePink: "#FF0050",
  accentCyan: "#25F4EE",
  accentGold: "#FFD700",
  /** Glass surfaces */
  glass: "rgba(255,255,255,0.12)",
  glassStrong: "rgba(255,255,255,0.18)",
  glassBorder: "rgba(255,255,255,0.22)",
  pillBg: "rgba(0,0,0,0.42)",
  pillBgStrong: "rgba(0,0,0,0.58)",
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const ttKeyboardBottom = (height: number, open: boolean) =>
  open ? (Platform.OS === "ios" ? height : 0) : 0;
