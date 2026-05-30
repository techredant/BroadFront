import React from "react";
import { router, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { LevelSocketProvider } from "@/contexts/LevelSocketContext";
import { Image, Pressable, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";
import { AnimatedTabBar } from "@/components/navigation/AnimatedTabBar";

function TabsNavigator() {
  const { theme } = useTheme();
  const { currentLevel, userDetails } = useLevel();
  const { user } = useUser();

  const profileImage =
    userDetails?.image && userDetails?.image.trim() !== ""
      ? userDetails.image
      : user?.imageUrl || "";

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subtext,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: theme.background,
          borderTopColor: theme.background,
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: currentLevel?.value,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="planet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          tabBarLabel: "Trends",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="input"
        options={{
          tabBarLabel: "",
          tabBarIcon: () => null,
          tabBarButton: () => (
            <Pressable
              onPress={() => router.push("/input")}
              style={{
                flex: 1,
                top: -5,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 30,
                  backgroundColor: "#1F2937",
                  justifyContent: "center",
                  alignItems: "center",
                  elevation: 8,
                  shadowColor: "#000",
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                }}
              >
                <Ionicons name="add" size={30} color="#fff" />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="news/index"
        options={{
          tabBarLabel: "News",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarLabel: "you",
          tabBarIcon: ({ color, size }) =>
            profileImage ? (
              <Image
                source={{ uri: userDetails?.image }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 32,
                  backgroundColor: theme.border,
                }}
              />
            ) : (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  const { currentLevel } = useLevel();

  return (
    <LevelSocketProvider currentLevel={currentLevel}>
      <TabBarVisibilityProvider>
        <TabsNavigator />
      </TabBarVisibilityProvider>
    </LevelSocketProvider>
  );
}
