
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        alignSelf: "stretch",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        paddingHorizontal: 20,
      }}
    >
      <View style={{ marginBottom: 16 }}>
        <Ionicons name={icon} size={64} color={theme.subtext} />
      </View>
      <Text
        style={{
          textAlign: "center",
          fontSize: 16,
          color: theme.subtext,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: 4,
          textAlign: "center",
          fontSize: 14,
          color: theme.subtext,
          opacity: 0.75,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
