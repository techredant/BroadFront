import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

const SCROLL_THRESHOLD = 6;
const BASE_TAB_HEIGHT = 56;

type TabBarVisibilityContextValue = {
  translateY: Animated.Value;
  tabBarHeight: number;
  onTabBarScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showTabBar: () => void;
};

const TabBarVisibilityContext =
  createContext<TabBarVisibilityContextValue | null>(null);

export function TabBarVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = BASE_TAB_HEIGHT + insets.bottom;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const hiddenRef = useRef(false);

  const showTabBar = useCallback(() => {
    if (!hiddenRef.current) return;
    hiddenRef.current = false;
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const hideTabBar = useCallback(() => {
    if (hiddenRef.current) return;
    hiddenRef.current = true;
    Animated.timing(translateY, {
      toValue: tabBarHeight,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [tabBarHeight, translateY]);

  const onTabBarScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const diff = y - lastScrollY.current;

      if (y <= 8) {
        showTabBar();
      } else if (diff > SCROLL_THRESHOLD) {
        hideTabBar();
      } else if (diff < -SCROLL_THRESHOLD) {
        showTabBar();
      }

      lastScrollY.current = y;
    },
    [hideTabBar, showTabBar],
  );

  const value = useMemo(
    () => ({ translateY, tabBarHeight, onTabBarScroll, showTabBar }),
    [translateY, tabBarHeight, onTabBarScroll, showTabBar],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

function useTabBarVisibilityContext() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useTabBarVisibility must be used within TabBarVisibilityProvider",
    );
  }
  return ctx;
}

export function useTabBarVisibility() {
  return useTabBarVisibilityContext();
}

export function useTabBarScrollHandler() {
  const ctx = useContext(TabBarVisibilityContext);
  return ctx?.onTabBarScroll ?? (() => {});
}

/** Re-show tab bar when this screen gains focus (e.g. after switching tabs). */
export function useShowTabBarOnFocus() {
  const { showTabBar } = useTabBarVisibilityContext();
  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar]),
  );
}
