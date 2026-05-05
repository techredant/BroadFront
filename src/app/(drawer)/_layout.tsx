import React from "react";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { router, usePathname } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import ChatWrapper from "../components/ChatWrapper";
import { useChatContext } from "stream-chat-expo";

/* =======================
   CUSTOM DRAWER CONTENT
======================= */
const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { user } = useUser();
  const { userDetails, isLoadingUser, setCurrentLevel } = useLevel();
  const { theme } = useTheme();
  const { client } = useChatContext();
  const pathname = usePathname();

  // Get unread count from Stream Chat
  const unreadCount = (client?.user as any)?.unread_count || 0;
  const newProductsCount = 1; // TODO: Implement new products count logic

  const drawerItems = [
    {
      name: "(tabs)",
      label: "Home",
      icon: "home-outline",
      onPress: () => {
        setCurrentLevel({ type: "home", value: "home" });

        props.navigation.closeDrawer(); // ✅ CLOSE DRAWER FIRST

        setTimeout(() => {
          router.replace("/(tabs)"); // ✅ THEN NAVIGATE
        }, 50); // small delay prevents glitch
      },
      badge: 0,
    },
    // {
    //   name: "trends",
    //   label: "Trends",
    //   icon: "flame-outline",
    //   badge: 0,
    // },
    {
      name: "(stream)",
      label: "Chat",
      icon: "chatbubble-ellipses-outline",
      badge: unreadCount,
    },
    {
      name: "status",
      label: "Status",
      icon: "time-outline",
      badge: 0,
    },
    {
      name: "(market)",
      label: "Market",
      icon: "cart-outline",
      badge: newProductsCount,
    },
    {
      name: "members",
      label: "Members",
      icon: "people-outline",
      badge: 0,
    },
    {
      name: "media",
      label: "Media",
      icon: "images-outline",
      badge: 0,
    },
    {
      name: "settings",
      label: "Settings",
      icon: "settings-outline",
      badge: 0,
    },
    {
      name: "(live)",
      label: "Live Streams",
      icon: "radio-outline",
      badge: 0,
    },
    {
      name: "(audio)",
      label: "Audio Rooms",
      icon: "mic-circle",
      badge: 0,
    },
  ];

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
        {drawerItems.map((item) => (
          <Pressable
            key={item.name}
            onPress={() => {
              if (item.onPress) {
                item.onPress();
              } else {
                props.navigation.navigate(item.name);
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginHorizontal: 0,
            }}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={pathname.includes(item.name) ? theme.primary : theme.text}
            />
            <Text
              style={{
                fontSize: 15,
                color: pathname.includes(item.name)
                  ? theme.primary
                  : theme.text,
                marginLeft: 16,
                flex: 1,
              }}
            >
              {item.label}
            </Text>
            {item.badge > 0 && (
              <View
                style={{
                  backgroundColor: theme.danger,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 6,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </DrawerContentScrollView>
  );
};

/* =======================
   ROOT LAYOUT (FIXED)
======================= */
export default function DrawerLayout() {
  const { theme } = useTheme();
  const { userDetails, setCurrentLevel } = useLevel();
  const { user } = useUser();

  return (
    <ChatWrapper userDetail={userDetails}>
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
            fontWeight: "bold",
            color: theme.text,
          },
          drawerActiveTintColor: theme.primary,
          drawerInactiveTintColor: theme.text,
          drawerType: "front",
          swipeEnabled: false,
        }}
        initialRouteName="(tabs)"
      >
        {/* HOME */}
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: "Home",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
     
        />

        {/* TRENDS */}
        <Drawer.Screen
          name="trend"
          options={{
            drawerLabel: "Trends",
            drawerItemStyle: { display: "none" }, // HIDDEN FOR NOW
            drawerIcon: ({ color, size }) => (
              <Ionicons name="flame-outline" size={size} color={color} />
            ),
          }}
        />

        {/* CHAT */}
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

        {/* STATUS */}
        <Drawer.Screen
          name="status"
          options={{
            drawerLabel: "Status",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />

        {/* MARKET */}
        <Drawer.Screen
          name="(market)"
          options={{
            drawerLabel: "Market",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size} color={color} />
            ),
          }}
        />

        {/* MEMBERS */}
        <Drawer.Screen
          name="members"
          options={{
            drawerLabel: "Members",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />

        {/* MEDIA */}
        <Drawer.Screen
          name="media"
          options={{
            drawerLabel: "Media",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="images-outline" size={size} color={color} />
            ),
          }}
        />

        {/* SETTINGS */}
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: "Settings",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />

        {/* LIVE */}
        <Drawer.Screen
          name="(live)"
          options={{
            drawerLabel: "Live Streams",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="radio-outline" size={size} color={color} />
            ),
          }}
        />

        {/* AUDIO */}
        <Drawer.Screen
          name="(audio)"
          options={{
            drawerLabel: "Audio Rooms",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="mic-circle" size={size} color={color} />
            ),
          }}
        />

        {/* PROFILE */}
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "Your Profile",
            drawerIcon: () => (
              <Image
                source={{
                  uri: userDetails?.image || user?.imageUrl,
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: theme.border,
                }}
              />
            ),
          }}
        />

        {/* HIDDEN SCREENS */}
        <Drawer.Screen
          name="(status)"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="(drawerPages)"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="(ai)/index"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="(profileId)"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </ChatWrapper>
  );
}
