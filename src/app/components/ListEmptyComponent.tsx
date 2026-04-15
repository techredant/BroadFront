import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export default function ListEmptyComponent() {
  return (
    <View className="items-center pt-20 gap-2">
      <Ionicons name="people-outline" size={48} color={COLORS.textSubtle} />
      <Text className="text-[17px] font-semibold text-foreground">No users found</Text>
    </View>
  );
}
