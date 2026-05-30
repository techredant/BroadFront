import { useTheme } from "@/context/ThemeContext";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from "react-native-svg";

const { width, height } = Dimensions.get("window");

/** WhatsApp-style doodle wallpaper (light beige / dark slate). */
export function ChatWallpaper() {
  const { isDark } = useTheme();
  const base = isDark ? "#0B141A" : "#ECE5DD";
  const ink = isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.07)";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="waChatPattern"
            patternUnits="userSpaceOnUse"
            width={88}
            height={88}
          >
            <G opacity={1}>
              <Circle cx={14} cy={16} r={5} fill={ink} />
              <Path
                d="M52 10c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z"
                fill={ink}
              />
              <Path
                d="M24 48h14a4 4 0 0 1 0 8H24a4 4 0 0 1 0-8z"
                fill={ink}
              />
              <Path
                d="M62 52l8 6-8 6v-12z"
                fill={ink}
              />
              <Circle cx={72} cy={24} r={3.5} fill={ink} />
              <Path
                d="M8 72c6-8 18-8 24 0M44 70c5-6 15-6 20 0"
                stroke={ink}
                strokeWidth={2}
                fill="none"
              />
            </G>
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#waChatPattern)" />
      </Svg>
    </View>
  );
}
