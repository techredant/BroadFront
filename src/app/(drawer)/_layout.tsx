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
const navigation = useNavigation();

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
                @{userDetails?.nickName || "guest"}
              </Text>
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
      </Pressable>
     <Pressable
  onPress={() => {
    setCurrentLevel({ type: "home", value: "home" });

    // 🔴 CLOSE DRAWER (correct navigator level)

    // 🔴 CLOSE DRAWER (correct navigator level)
    navigation.getParent()?.dispatch(DrawerActions.closeDrawer());

    router.replace("/(drawer)/(tabs)"); // force go home (reset stack)
  }}
  style={{
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  }}
  >
        <Ionicons name="home-outline" size={26} color={theme.subtext} />
        <Text style={{ color: theme.text, fontWeight: "bold" }}>
          Go National
        </Text>
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
  const { currentLevel } = useLevel();

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
          drawerLabel: currentLevel?.value
            ? currentLevel.value.charAt(0).toUpperCase() +
              currentLevel.value.slice(1)
            : "Home",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="planet-outline" size={size} color={color} />
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
    </Drawer>
  );
}
