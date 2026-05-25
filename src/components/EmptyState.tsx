
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { theme } =useTheme()
  return (
    <View className="flex-1 items-center justify-center bg-surface-light px-5" style={{ backgroundColor: theme.background}}>
      <View className="mb-4">
        <Ionicons name={icon} size={64} color={theme.text} />
      </View>
      <Text className="text-center text-base text-foreground-muted">{title}</Text>
      <Text className="mt-1 text-center text-sm text-foreground-subtle">{subtitle}</Text>
    </View>
  );
}
