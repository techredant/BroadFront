import React from "react";
import { StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeScreen } from "./src/HomeScreen";
import { useTheme } from "@/context/ThemeContext";

export default function AudioIndex() {
  const { isDark } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <View style={{ flex: 1 }}>
        <HomeScreen />
      </View>
    </SafeAreaView>
  );
}
