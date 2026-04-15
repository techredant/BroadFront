import React from "react";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

const ArrowBackButton = () => {
  const { colorScheme } = useColorScheme();

  return (
    <Pressable
      onPress={() => router.back()}
      className="absolute top-10  z-10 p-2 rounded-full shadow bg-white dark:bg-gray-800"
      hitSlop={10}
    >
      <Ionicons
        name="close"
        size={24}
        color={colorScheme === "dark" ? "#fff" : "#000"}
      />
    </Pressable>
  );
};

export default ArrowBackButton;
