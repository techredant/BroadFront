import React from "react";
import { StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeScreen } from "@/components/audio/HomeScreen";
import { useTheme } from "@/context/ThemeContext";

export default function AudioIndex() {
  const { isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ flex: 1 }}>
        <HomeScreen />
      </View>
    </View>
  );
}
