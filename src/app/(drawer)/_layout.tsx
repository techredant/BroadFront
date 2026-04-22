import React from "react";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useUser } from "@clerk/clerk-expo";
import { router, usePathname } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";

/* =======================
   CUSTOM DRAWER CONTENT
======================= */
const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { user } = useUser();
  const { userDetails, isLoadingUser, setCurrentLevel } = useLevel();
  const { theme } = useTheme();

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        paddingTop: 0,
        backgroundColor: theme.card,
        flex: 1,
      }}
    >
      {/* HEADER */}
      <Pressable
        onPress={() => router.push("/(drawer)/(tabs)/profile")}
        style={{
          paddingTop: 48,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Image
          source={{
            uri: userDetails?.image || user?.imageUrl,
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 32,
            backgroundColor: theme.border,
          }}
        />

        <View style={{ marginLeft: 12, flex: 1 }}>
          {isLoadingUser ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.text,
                }}
                numberOfLines={1}
              >
                {userDetails?.firstName
                  ? `${userDetails.firstName} ${userDetails.lastName}`
                  : "Anonymous"}
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: theme.subtext,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {userDetails?.nickName || "guest"}
              </Text>
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
      </Pressable>
      {/* DRAWER ITEMS */}
      <View style={{ paddingTop: 8 }}>
        <DrawerItemList {...props} />
      </View>
    </DrawerContentScrollView>
  );
};

/* =======================
   MENU BUTTON (STATIC)
======================= */

/* =======================
   DRAWER LAYOUT
======================= */
export default function DrawerLayout() {
  const { theme } = useTheme();
  const { userDetails, setCurrentLevel } = useLevel();
  const { user } = useUser();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.card,
          width: 260,
        },
        drawerLabelStyle: {
          fontSize: 15,
          color: theme.text,
        },
        drawerActiveTintColor: theme.primary,
        drawerInactiveTintColor: theme.subtext,
        drawerType: "front",
        swipeEnabled: false, // 🔴 THIS disables swipe opening
      }}
      initialRouteName="(tabs)" // ✅ default route ONLY
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: "Home",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          drawerItemPress: (e) => {
            // Run your logic BEFORE navigation
            setCurrentLevel({ type: "home", value: "home" });
          },
        }}
      />

      <Drawer.Screen
        name="trend"
        options={{
          drawerLabel: "Trends",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="flame-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="(stream)"
        options={{
          drawerLabel: "Chat",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="status"
        options={{
          drawerLabel: "Status",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="(market)"
        options={{
          drawerLabel: "Market",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="trends"
        options={{
          drawerLabel: "Trends",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="members"
        options={{
          drawerLabel: "Members",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="media"
        options={{
          drawerLabel: "Media",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: "Settings",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="(live)"
        options={{
          drawerLabel: "Live Streams",
          drawerIcon: ({ color, size }) => (
            <Feather name="video" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="(audio)"
        options={{
          drawerLabel: "Audio Rooms",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="mic-circle" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: "Your Profile",
          drawerIcon: ({ color, size }) => (
            <Image
              source={{
                uri: userDetails?.image || user?.imageUrl,
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 32,
                backgroundColor: theme.border,
              }}
            />
          ),
        }}
      />
    </Drawer>
  );
}
