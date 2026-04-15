import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";

export default function OnboardingLayout() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
