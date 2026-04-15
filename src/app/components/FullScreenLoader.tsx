import { COLORS } from "@/lib/theme";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function FullScreenLoader({ message }: { message: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} className="mb-2" />
        <Text className="text-foreground-muted">{message}</Text>
      </View>
    </SafeAreaView>
  );
}
