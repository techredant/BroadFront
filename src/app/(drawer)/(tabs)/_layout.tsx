// import { useUser } from "@clerk/clerk-expo";
// import { useLevel } from "../../../../context/LevelContext";
// import { useTheme } from "../../../../context/ThemeContext";
// import { NativeTabs } from "expo-router/unstable-native-tabs";

// export default function TabsLayout() {
//   const { currentLevel, userDetails } = useLevel();
//   const { theme } = useTheme();
//   const { user } = useUser();

//   const profileImage =
//     userDetails?.image && userDetails.image.trim() !== ""
//       ? userDetails.image
//       : user?.imageUrl || "";

//   return (
//     <NativeTabs lazy={false} screenOptions={{ headerShown: false }}>
//       {/* HOME */}
//       <NativeTabs.Trigger name="index">
//         <NativeTabs.Trigger.Label>
//           {currentLevel?.value
//             ? currentLevel.value.charAt(0).toUpperCase() +
//               currentLevel.value.slice(1)
//             : "Home"}
//         </NativeTabs.Trigger.Label>
//         <NativeTabs.Trigger.Icon sf="globe" md="public" selectedColor={theme.primary} />
//       </NativeTabs.Trigger>

//       {/* MARKET */}
//       <NativeTabs.Trigger name="market/index">
//         <NativeTabs.Trigger.Label>Market</NativeTabs.Trigger.Label>
//         <NativeTabs.Trigger.Icon sf="cart" md="shopping_cart" selectedColor={theme.primary} />
//       </NativeTabs.Trigger>

//       {/* INPUT */}
//       <NativeTabs.Trigger name="input">
//         <NativeTabs.Trigger.Label>Post</NativeTabs.Trigger.Label>
//         <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" selectedColor={theme.primary} />
//       </NativeTabs.Trigger>

//       {/* NEWS */}
//       <NativeTabs.Trigger name="news/index">
//         <NativeTabs.Trigger.Label>News</NativeTabs.Trigger.Label>
//         <NativeTabs.Trigger.Icon sf="newspaper" md="article" selectedColor={theme.primary} />
//       </NativeTabs.Trigger>

//       {/* PROFILE */}
//       <NativeTabs.Trigger name="profile/index">
//         <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
//         <NativeTabs.Trigger.Icon sf="person.fill" md="person" selectedColor={"#6C5CE7"} />
//       </NativeTabs.Trigger>
//     </NativeTabs>
//   );
// }

// src/app/(tabs)/_layout.tsx
import React from "react";
import { router, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { LevelSocketProvider } from "@/contexts/LevelSocketContext";
import { Image, Pressable, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

export default function TabsLayout() {
  const { theme } = useTheme();
  const { currentLevel, userDetails } = useLevel();
  const { user } = useUser();

  const profileImage =
    userDetails?.image && userDetails.image.trim() !== ""
      ? userDetails.image
      : user?.imageUrl || "";

  return (
    <LevelSocketProvider currentLevel={currentLevel}>
      <Tabs
        // lazy={false} // Mount all tabs immediately
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.subtext,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
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
          name="trends/index"
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

            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => router.push("/input")}
                style={{
                  top: -5, // 👈 lifts above tab bar
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
                  source={{
                    uri: userDetails?.image || user?.imageUrl,
                  }}
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

      {/* <PostButton /> */}
    </LevelSocketProvider>
  );
}
