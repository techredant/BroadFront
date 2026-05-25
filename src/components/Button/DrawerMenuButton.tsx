import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";

export const DrawerMenuButton = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={{
        position: "absolute",
        top: 40,
        left: 16,
        zIndex: 100,
        backgroundColor: "#1F2937",
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="menu" size={22} color="#fff" />
    </Pressable>
  );
};
