import { Text } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

export function LevelHeader() {
  const { theme } = useTheme();
  const { currentLevel } = useLevel();

  const rawLevelValue =
    typeof currentLevel === "object"
      ? currentLevel?.value
      : (currentLevel ?? "home");

  const levelType =
    typeof currentLevel === "object" ? currentLevel?.type : null;

  // 🔥 Convert "home" → "national"
  const displayValue =
    rawLevelValue?.toLowerCase() === "home"
      ? "national"
      : (rawLevelValue ?? "national");

  const formattedLevel =
    displayValue.charAt(0).toUpperCase() + displayValue.slice(1);

  return (
    <Animated.View
      entering={FadeInUp.delay(200)}
      className="px-4 py-2 justify-center items-center mt-8"
      style={{ backgroundColor: theme.card }}
    >
      <Text
        className="font-bold text-2xl"
        style={{ color: theme.text, fontSize: 18, marginTop: 14 }}
      >
        {formattedLevel}
        {levelType && levelType !== "home" ? ` ${levelType}` : ""} news
      </Text>
    </Animated.View>
  );
}
