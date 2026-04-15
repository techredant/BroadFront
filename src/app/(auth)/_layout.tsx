import { Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ActivityIndicator, View } from "react-native";

export default function AuthRoutesLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // Wait for Clerk to load
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If signed in, RootLayout will redirect, so just render nothing for now
  if (isSignedIn) {
    return null;
  }

  // Render auth stack: sign-in, sign-up, etc.
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}