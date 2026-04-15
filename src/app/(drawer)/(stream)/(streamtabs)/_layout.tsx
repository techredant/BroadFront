import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";

export default function StreamTabsLayout() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { userDetails } = useLevel();
  const { theme } = useTheme();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href={"/(auth)"} />;

  const profileImage =
    userDetails?.image && userDetails.image.trim() !== ""
      ? userDetails.image
      : "";

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.subtext,
          tabBarStyle: {
            backgroundColor: "#0F0E17",
            borderTopColor: "#0F0E17",
          },
        }}
      >
        {/* Home / Chats tab */}
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: "Chats",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        {/* Explore tab */}
        <Tabs.Screen
          name="explore"
          options={{
            tabBarLabel: "Explore",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Profile tab */}
        <Tabs.Screen
          name="profile"
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, size }) =>
              profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={{ width: 30, height: 30, borderRadius: 32 }}
                />
              ) : (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
          }}
        />
      </Tabs>
    </>
  );
}
