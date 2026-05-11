import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import "../../global.css";

import { AppProvider } from "@/contexts/AppProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";
import { MenuProvider } from "react-native-popup-menu";
import { useEffect, useState } from "react";

import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LevelProvider } from "@/context/LevelContext";
import { UserOnboardingProvider } from "@/context/UserOnBoardingContext";
import { NotificationProvider } from "@/context/notification";
import { FollowProvider } from "@/context/FollowContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ===========================
   🔔 NOTIFICATION CLICK HANDLER
   =========================== */
function useNotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    const redirect = (notification: Notifications.Notification) => {
      const data = notification.request.content.data as any;

      const url = data?.url;

      if (typeof url === "string" && url.startsWith("/")) {
        router.push(url);
      }
    };

    const last = Notifications.getLastNotificationResponse();

    if (last?.notification) {
      redirect(last.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        redirect(response.notification);
      },
    );

    return () => subscription.remove();
  }, []);
}

/* ===========================
   ROOT LAYOUT
   =========================== */
export default function RootLayout() {
  useNotificationObserver();

  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
        tokenCache={tokenCache}
      >
        <ThemeProvider>
          <RootInnerLayout />
        </ThemeProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

/* ===========================
   INNER LAYOUT
   =========================== */
function RootInnerLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  const { user } = useUser();

  const router = useRouter();

  const segments = useSegments();

  const { theme } = useTheme();

  const [appReady, setAppReady] = useState(false);

  /* ===========================
     PREVENT SPLASH AUTO HIDE
     =========================== */
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  /* ===========================
     ROUTING LOGIC
     =========================== */
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inDrawerGroup = segments[0] === "(drawer)";

    const hasCompletedName = user?.unsafeMetadata?.hasCompletedName;

    const onboardingComplete = user?.unsafeMetadata?.onboardingComplete;

    const accountType = user?.unsafeMetadata?.myAccountType;

    const isPersonal = accountType === "Personal Account";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)");
    } else if (isSignedIn && !hasCompletedName && !inOnboardingGroup) {
      router.replace("/(onboarding)/nameScreen");
    } else if (
      isSignedIn &&
      hasCompletedName &&
      isPersonal &&
      !onboardingComplete &&
      !inOnboardingGroup
    ) {
      router.replace("/(onboarding)/location");
    } else if (isSignedIn && onboardingComplete && !inDrawerGroup) {
      router.replace("/(drawer)/(tabs)");
    }

    const prepare = async () => {
      await SplashScreen.hideAsync();

      // 🔥 wait until app fully renders
      setTimeout(() => {
        setAppReady(true);
      }, 1500);
    };

    prepare();
  }, [isLoaded, isSignedIn, user?.unsafeMetadata, segments]);

  /* ===========================
     PUSH NOTIFICATIONS
     =========================== */
  useEffect(() => {
    if (!appReady) return;

    const registerPush = async () => {
      if (!isSignedIn || !user?.id) return;

      if (!Device.isDevice) return;

      try {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();

        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();

          finalStatus = status;
        }

        if (finalStatus !== "granted") return;

        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: "e693fdcd-e810-4cf4-ae07-e5218d8032c1",
          })
        ).data;

        console.log("🔥 PUSH TOKEN:", token);

        const storedToken = await AsyncStorage.getItem("pushToken");

        if (storedToken !== token) {
          await axios.post(
            "https://cast-api-zeta.vercel.app/api/notification-token/token",
            {
              userId: user.id,
              token,
            },
          );

          await AsyncStorage.setItem("pushToken", token);
        }
      } catch (err) {
        console.log("Push setup error:", err);
      }
    };

    registerPush();
  }, [appReady, isSignedIn, user?.id]);

  /* ===========================
     LOADING STATE
     =========================== */
  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  /* ===========================
     APP TREE
     =========================== */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LevelProvider>
        <UserOnboardingProvider>
          <FollowProvider>
            <MenuProvider>
              <NotificationProvider>
                <AppProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                    }}
                  />
                </AppProvider>
              </NotificationProvider>
            </MenuProvider>
          </FollowProvider>
        </UserOnboardingProvider>
      </LevelProvider>
    </GestureHandlerRootView>
  );
}
