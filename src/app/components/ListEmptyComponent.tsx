
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export default function ListEmptyComponent() {
  const { theme } =useTheme()
  return (
    <View className="items-center pt-20 gap-2">
      <Ionicons name="people-outline" size={48} color={theme.text} />
      <Text className="text-[16px] font-semibold text-foreground">No users found</Text>
    </View>
  );
}
