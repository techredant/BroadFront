// RootLayout.tsx
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import "../../global.css";
import { AppProvider } from "@/contexts/AppProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import { useEffect } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { LevelProvider } from "@/context/LevelContext";
import { UserOnboardingProvider } from "@/context/UserOnBoardingContext";
import { UserProvider } from "@/context/FollowContext";
import { NotificationProvider } from "@/context/notification";

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <RootInnerLayout />
    </ClerkProvider>
  );
}

function RootInnerLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const segments = useSegments();

  // 1. Handle Splash Screen separately (and only once)
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  // 2. Auth & Onboarding Redirect Logic
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inDrawerGroup = segments[0] === "(drawer)";

    const hasCompletedName = user?.unsafeMetadata?.hasCompletedName;
    const onboardingComplete = user?.unsafeMetadata?.onboardingComplete;

    // Case: Not signed in
    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)");
    }
    // Case: Signed in but needs Name
    else if (isSignedIn && !hasCompletedName && !inOnboardingGroup) {
      router.replace("/(onboarding)/nameScreen");
    }
    // Case: Signed in, has name, needs Location
    else if (
      isSignedIn &&
      hasCompletedName &&
      !onboardingComplete &&
      !inOnboardingGroup
    ) {
      router.replace("/(onboarding)/location");
    }
    // Case: Fully ready, move to main app
    else if (
      isSignedIn &&
      onboardingComplete &&
      !inDrawerGroup &&
      !inOnboardingGroup
    ) {
      router.replace("/(drawer)/(tabs)");
    }

    // Hide splash screen once we've figured out where to go
    SplashScreen.hideAsync();
  }, [isLoaded, isSignedIn, user?.unsafeMetadata, segments]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LevelProvider>
          <UserOnboardingProvider>
            {/* Wrap specific providers only if user exists to prevent crashes */}
            {isSignedIn ? (
              <UserProvider currentUserId={user!.id}>
                <MenuProvider>
                  <NotificationProvider>
                    <AppProvider>
                      <Stack screenOptions={{ headerShown: false }} />
                    </AppProvider>
                  </NotificationProvider>
                </MenuProvider>
              </UserProvider>
            ) : (
              // Auth stack (doesn't need Stream/Chat contexts)
              <Stack screenOptions={{ headerShown: false }} />
            )}
          </UserOnboardingProvider>
        </LevelProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
