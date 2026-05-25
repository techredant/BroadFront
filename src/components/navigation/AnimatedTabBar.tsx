import React from "react";
import { Animated } from "react-native";
import { BottomTabBar, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";

export function AnimatedTabBar(props: BottomTabBarProps) {
  const { translateY } = useTabBarVisibility();

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        transform: [{ translateY }],
      }}
    >
      <BottomTabBar {...props} />
    </Animated.View>
  );
}
