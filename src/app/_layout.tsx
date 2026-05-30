import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SplashScreen, Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import "../../global.css";

import { AppProvider } from "@/contexts/AppProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useMemo } from "react";

import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LevelProvider, useLevel } from "@/context/LevelContext";
import { UserOnboardingProvider } from "@/context/UserOnBoardingContext";
import { NotificationProvider } from "@/context/notification";
import { FollowProvider } from "@/context/FollowContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PushPromptProvider } from "@/context/PushPromptContext";
import { NotificationBridge } from "@/components/notifications/NotificationBridge";
import { IncomingCallProvider } from "@/components/notifications/IncomingCallOverlay";
import { GlobalStreamVideoProvider } from "@/components/call/GlobalStreamVideoProvider";
import { MediaViewerProvider } from "@/context/MediaViewerContext";
import { ActiveLiveHostsProvider } from "@/context/ActiveLiveHostsContext";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

/* ===========================
   NOTIFICATION CLICK HANDLER
   =========================== */
import * as Notifications from "expo-notifications";
import { MenuProvider } from "react-native-popup-menu";

import "@/utils/notification";
import {
  handleNotificationRedirect,
  shouldAutoOpenInForeground,
} from "@/utils/notificationRouting";

void SplashScreen.preventAutoHideAsync();

function useNotificationObserver() {
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const last = Notifications.getLastNotificationResponse();

    if (last?.notification) {
      handleNotificationRedirect(router, last.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationRedirect(router, response.notification);
      },
    );

    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (shouldAutoOpenInForeground(notification)) {
          handleNotificationRedirect(router, notification);
        }
      },
    );

    return () => {
      subscription.remove();
      receivedSub.remove();
    };
  }, [router, navigationState?.key]);
}

function SplashController() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const { isLoadingUser, loadingPosts, currentLevel } = useLevel();
  const { isReady: themeReady } = useTheme();

  const inAuthGroup = segments[0] === "(auth)";
  const inOnboardingGroup = segments[0] === "(onboarding)";
  const inDrawerGroup = segments[0] === "(drawer)";

  const hasCompletedName = user?.unsafeMetadata?.hasCompletedName;
  const onboardingComplete = user?.unsafeMetadata?.onboardingComplete;
  const accountType = user?.unsafeMetadata?.myAccountType;
  const isPersonal = accountType === "Personal Account";

  const routingSettled = useMemo(() => {
    if (!isLoaded) return false;

    if (!isSignedIn) return inAuthGroup;

    if (!hasCompletedName) return inOnboardingGroup;

    if (hasCompletedName && isPersonal && !onboardingComplete) {
      return inOnboardingGroup;
    }

    if (onboardingComplete) return inDrawerGroup;

    return inDrawerGroup;
  }, [
    isLoaded,
    isSignedIn,
    hasCompletedName,
    isPersonal,
    onboardingComplete,
    inAuthGroup,
    inOnboardingGroup,
    inDrawerGroup,
  ]);

  const needsFeedBootstrap =
    isSignedIn && !!onboardingComplete && inDrawerGroup;

  const mainAppDataReady =
    !isLoadingUser && !!currentLevel && !loadingPosts;

  const canHideSplash =
    themeReady &&
    isLoaded &&
    routingSettled &&
    (!needsFeedBootstrap || mainAppDataReady);

  useEffect(() => {
    if (canHideSplash) {
      SplashScreen.hideAsync();
    }
  }, [canHideSplash]);

  return null;
}

/* ===========================
   ROOT LAYOUT
   =========================== */
export default function RootLayout() {
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
  const { theme } = useTheme();

  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useNotificationObserver();
  usePresenceHeartbeat(user?.id);

  useEffect(() => {
    if (!navigationState?.key || !isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inDrawerGroup = segments[0] === "(drawer)";

    const hasCompletedName = user?.unsafeMetadata?.hasCompletedName;
    const onboardingComplete = user?.unsafeMetadata?.onboardingComplete;
    const accountType = user?.unsafeMetadata?.myAccountType;

    const isPersonal = accountType === "Personal Account";

    const id = requestAnimationFrame(() => {
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
    });

    return () => cancelAnimationFrame(id);
  }, [
    navigationState?.key,
    isLoaded,
    isSignedIn,
    user?.unsafeMetadata,
    segments,
    router,
  ]);

  /* ===========================
     APP TREE
     =========================== */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LevelProvider>
        <PushPromptProvider>
        <UserOnboardingProvider>
          <FollowProvider>
            <MenuProvider>
              <NotificationProvider>
                <AppProvider>
                  <ActiveLiveHostsProvider>
                    <MediaViewerProvider>
                      <IncomingCallProvider>
                        <GlobalStreamVideoProvider>
                          <SplashController />
                          <NotificationBridge />
                          <Stack
                            screenOptions={{
                              headerShown: false,
                              contentStyle: { backgroundColor: theme.background },
                            }}
                          />
                        </GlobalStreamVideoProvider>
                      </IncomingCallProvider>
                    </MediaViewerProvider>
                  </ActiveLiveHostsProvider>
                </AppProvider>
              </NotificationProvider>
            </MenuProvider>
          </FollowProvider>
        </UserOnboardingProvider>
        </PushPromptProvider>
      </LevelProvider>
    </GestureHandlerRootView>
  );
}
