import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";
import axios from "axios";
import { registerForPushNotificationsAsync } from "@/utils/notification";
import { useEffect } from "react";

export default function OnboardingLayout() {
  const { isLoaded, user } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    const setupPush = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await axios.post("https://cast-api-zeta.vercel.app/api/users/token", {
          userId: user.id,
          token,
        });
      }
    };

    setupPush();
  }, [user?.id]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
