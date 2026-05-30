import React, { useContext, useMemo } from "react";

import { Drawer } from "expo-router/drawer";

import {

  DrawerContentComponentProps,

  DrawerContentScrollView,

} from "@react-navigation/drawer";

import {

  ActivityIndicator,

  Dimensions,

  Image,

  Pressable,

  StyleSheet,

  Text,

  View,

} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useUser } from "@clerk/clerk-expo";

import { router } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLevel } from "@/context/LevelContext";

import {

  NotificationContext,

} from "@/context/notification";

import { useTheme } from "@/context/ThemeContext";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.8;

const hiddenDrawerItem = { drawerItemStyle: { display: "none" as const } };



const ACCENTS = {

  liveIconBg: "rgba(239, 68, 68, 0.18)",

  liveIcon: "#FF453A",

  audioIconBg: "rgba(175, 82, 222, 0.2)",

  audioIcon: "#BF5AF2",

};



type IoniconName = React.ComponentProps<typeof Ionicons>["name"];



type DrawerNavItem = {

  key: string;

  label: string;

  icon: IoniconName;

  drawerRoute?: string;

  href?: string;

  iconBg?: string;

  iconColor?: string;

  badge?: number;

  trailing?: "live-dot";

};



const MAIN_NAV: DrawerNavItem[] = [

  { key: "home", label: "Home", icon: "home-outline", drawerRoute: "(tabs)" },

  {

    key: "activity",

    label: "Activity",

    icon: "notifications-outline",

    href: "/(drawer)/(drawerPages)/ActivityInbox",

  },

  {

    key: "chat",

    label: "Chat",

    icon: "chatbubble-ellipses-outline",

    drawerRoute: "(stream)",

  },

  {

    key: "status",

    label: "Status",

    icon: "time-outline",

    href: "/(drawer)/(status)/StatusInput",

  },

  { key: "members", label: "Members", icon: "people-outline", drawerRoute: "members" },

  { key: "market", label: "Market", icon: "cart-outline", drawerRoute: "(market)" },

  {

    key: "promote",

    label: "Promote",

    icon: "megaphone-outline",

    drawerRoute: "advertiser",

  },

  { key: "media", label: "Media", icon: "images-outline", drawerRoute: "media" },

  { key: "polls", label: "Polls", icon: "list-outline", drawerRoute: "polls" },

];



const LIVE_NAV: DrawerNavItem[] = [

  {

    key: "live",

    label: "Live streams",

    icon: "radio-outline",

    drawerRoute: "(live)",

    iconBg: ACCENTS.liveIconBg,

    iconColor: ACCENTS.liveIcon,

    trailing: "live-dot",

  },

  {

    key: "audio",

    label: "Audio rooms",

    icon: "mic-outline",

    drawerRoute: "(audio)",

    iconBg: ACCENTS.audioIconBg,

    iconColor: ACCENTS.audioIcon,

  },

];



const SETTINGS_NAV: DrawerNavItem[] = [

  {

    key: "settings",

    label: "Settings",

    icon: "settings-outline",

    drawerRoute: "settings",

  },

];



function createDrawerStyles(theme: ReturnType<typeof useTheme>["theme"], isDark: boolean) {

  const iconSquareBg = isDark ? (theme.badge ?? theme.border) : theme.border;



  return StyleSheet.create({

    scroll: {

      backgroundColor: theme.background,

    },

    scrollContent: {

      flexGrow: 1,

      backgroundColor: theme.background,

    },

    header: {

      flexDirection: "row",

      alignItems: "flex-start",

      justifyContent: "space-between",

      paddingHorizontal: 20,

      marginBottom: 20,

    },

    headerProfile: {

      flexDirection: "row",

      alignItems: "center",

      flex: 1,

      paddingRight: 12,

    },

    avatar: {

      width: 48,

      height: 48,

      borderRadius: 24,

      backgroundColor: iconSquareBg,

    },

    headerText: {

      marginLeft: 12,

      flex: 1,

      justifyContent: "center",

      minHeight: 48,

    },

    displayName: {

      fontSize: 16,

      fontWeight: "700",

      color: theme.text,

    },

    handle: {

      fontSize: 13,

      color: theme.subtext,

      marginTop: 2,

    },

    closeButton: {

      padding: 4,

    },

    card: {

      backgroundColor: theme.card,

      borderRadius: 18,

      marginHorizontal: 16,

      marginBottom: 18,

      paddingVertical: 16,

      paddingHorizontal: 14,

      gap: 12,

      overflow: "hidden",

    },

    row: {

      flexDirection: "row",

      alignItems: "center",

      width: "100%",

      paddingHorizontal: 0,

      paddingVertical: 18,

    },

    rowContent: {

      flex: 1,

      flexDirection: "row",

      alignItems: "center",

      gap: 12,

      minWidth: 0,

    },

    rowLeading: {

      flex: 1,

      flexDirection: "row",

      alignItems: "center",

      gap: 12,

      flexShrink: 1,

      minWidth: 0,

    },

    rowDivider: {

      borderBottomWidth: StyleSheet.hairlineWidth,

      borderBottomColor: theme.border,

    },

    rowPressed: {

      opacity: 0.75,

    },

    iconSquare: {

      width: 36,

      height: 36,

      borderRadius: 10,

      alignItems: "center",

      justifyContent: "center",

      flexShrink: 0,

      backgroundColor: iconSquareBg,

    },

    rowLabel: {

      flexShrink: 1,

      minWidth: 0,

      fontSize: 15,

      lineHeight: 19,

      fontWeight: "500",

      color: theme.text,

      includeFontPadding: false,

    },

    rowTrailing: {

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "center",

      alignSelf: "center",

      gap: 8,

      flexShrink: 0,

    },

    badge: {

      minWidth: 22,

      height: 22,

      borderRadius: 11,

      backgroundColor: theme.danger ?? "#FF3B30",

      alignItems: "center",

      justifyContent: "center",

      paddingHorizontal: 6,

    },

    badgeText: {

      color: theme.buttonText ?? "#fff",

      fontSize: 11,

      fontWeight: "700",

    },

    liveDot: {

      width: 8,

      height: 8,

      borderRadius: 4,

      backgroundColor: theme.danger ?? "#FF3B30",

      alignSelf: "center",

    },

  });

}



type DrawerStyles = ReturnType<typeof createDrawerStyles>;



function DrawerCard({

  children,

  styles,

}: {

  children: React.ReactNode;

  styles: DrawerStyles;

}) {

  return <View style={styles.card}>{children}</View>;

}



function DrawerNavRow({

  item,

  isLast,

  onPress,

  styles,

  theme,

}: {

  item: DrawerNavItem;

  isLast?: boolean;

  onPress: () => void;

  styles: DrawerStyles;

  theme: ReturnType<typeof useTheme>["theme"];

}) {

  const showBadge = item.key === "activity" && (item.badge ?? 0) > 0;



  const hasTrailing = showBadge || item.trailing === "live-dot";



  return (

    <Pressable

      onPress={onPress}

      style={({ pressed }) => [

        styles.row,

        !isLast && styles.rowDivider,

        pressed && styles.rowPressed,

      ]}

    >

      <View style={styles.rowContent}>

        <View style={styles.rowLeading}>

          <View

            style={[

              styles.iconSquare,

              item.iconBg ? { backgroundColor: item.iconBg } : null,

            ]}

          >

            <Ionicons

              name={item.icon}

              size={20}

              color={item.iconColor ?? theme.text}

            />

          </View>



          <Text style={styles.rowLabel} numberOfLines={1}>

            {item.label}

          </Text>

        </View>



        {hasTrailing ? (

          <View style={styles.rowTrailing}>

            {showBadge ? (

              <View style={styles.badge}>

                <Text style={styles.badgeText}>

                  {(item.badge ?? 0) > 99 ? "99+" : item.badge}

                </Text>

              </View>

            ) : null}

            {item.trailing === "live-dot" ? <View style={styles.liveDot} /> : null}

          </View>

        ) : null}

      </View>

    </Pressable>

  );

}



const CustomDrawerContent = (props: DrawerContentComponentProps) => {

  const { navigation } = props;

  const { user } = useUser();

  const { userDetails, isLoadingUser } = useLevel();

  const insets = useSafeAreaInsets();

  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createDrawerStyles(theme, isDark), [theme, isDark]);

  const activityUnread =

    useContext(NotificationContext)?.unreadCount ?? 0;



  const mainNav = MAIN_NAV.map((item) =>

    item.key === "activity" ? { ...item, badge: activityUnread } : item,

  );



  const navigateItem = (item: DrawerNavItem) => {

    navigation.closeDrawer();

    if (item.drawerRoute) {

      navigation.navigate(item.drawerRoute);

      return;

    }

    if (item.href) {

      router.push(item.href as never);

    }

  };



  const displayName = userDetails?.firstName

    ? `${userDetails.firstName}${userDetails.lastName ? ` ${userDetails.lastName}` : ""}`

    : "Anonymous";



  return (

    <DrawerContentScrollView

      {...props}

      contentContainerStyle={[

        styles.scrollContent,

        { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 18 },

      ]}

      style={styles.scroll}

    >

      <View style={styles.header}>

        <View style={styles.headerProfile}>

          <Image

            source={{

              uri: userDetails?.image || user?.imageUrl,

            }}

            style={styles.avatar}

          />



          <View style={styles.headerText}>

            {isLoadingUser ? (

              <ActivityIndicator size="small" color={theme.text} />

            ) : (

              <>

                <Text style={styles.displayName} numberOfLines={1}>

                  {displayName}

                </Text>

                <Text style={styles.handle} numberOfLines={1}>

                  {userDetails?.nickName || "guest"}

                </Text>

              </>

            )}

          </View>

        </View>



        <Pressable

          onPress={() => navigation.closeDrawer()}

          hitSlop={12}

          style={styles.closeButton}

        >

          <Ionicons name="close" size={24} color={theme.text} />

        </Pressable>

      </View>



      <DrawerCard styles={styles}>

        {mainNav.map((item, index) => (

          <DrawerNavRow

            key={item.key}

            item={item}

            isLast={index === mainNav.length - 1}

            onPress={() => navigateItem(item)}

            styles={styles}

            theme={theme}

          />

        ))}

      </DrawerCard>



      <DrawerCard styles={styles}>

        {LIVE_NAV.map((item, index) => (

          <DrawerNavRow

            key={item.key}

            item={item}

            isLast={index === LIVE_NAV.length - 1}

            onPress={() => navigateItem(item)}

            styles={styles}

            theme={theme}

          />

        ))}

      </DrawerCard>



      <DrawerCard styles={styles}>

        {SETTINGS_NAV.map((item, index) => (

          <DrawerNavRow

            key={item.key}

            item={item}

            isLast={index === SETTINGS_NAV.length - 1}

            onPress={() => navigateItem(item)}

            styles={styles}

            theme={theme}

          />

        ))}

      </DrawerCard>

    </DrawerContentScrollView>

  );

};



export default function DrawerLayout() {
  const { theme } = useTheme();

  return (
      <Drawer

        drawerContent={(props) => <CustomDrawerContent {...props} />}

        screenOptions={{

          headerShown: false,

          drawerStyle: {

            backgroundColor: theme.background,

            width: DRAWER_WIDTH,

          },

          drawerType: "front",

          swipeEdgeWidth: 200,

          sceneStyle: {

            backgroundColor: theme.background,

          },

          ...hiddenDrawerItem,

        }}

        initialRouteName="(tabs)"

      >

        <Drawer.Screen name="(tabs)" options={hiddenDrawerItem} />

        <Drawer.Screen name="(stream)" options={hiddenDrawerItem} />

        <Drawer.Screen name="status" options={hiddenDrawerItem} />

        <Drawer.Screen name="(market)" options={hiddenDrawerItem} />

        <Drawer.Screen name="members" options={hiddenDrawerItem} />

        <Drawer.Screen name="media" options={hiddenDrawerItem} />

        <Drawer.Screen name="settings" options={hiddenDrawerItem} />

        <Drawer.Screen name="(live)" options={hiddenDrawerItem} />

        <Drawer.Screen name="(audio)" options={hiddenDrawerItem} />

        <Drawer.Screen name="(status)" options={hiddenDrawerItem} />

        <Drawer.Screen name="(drawerPages)" options={hiddenDrawerItem} />

        <Drawer.Screen name="(ai)" options={hiddenDrawerItem} />

        <Drawer.Screen name="(profileId)" options={hiddenDrawerItem} />

        <Drawer.Screen name="verification" options={hiddenDrawerItem} />

        <Drawer.Screen name="polls" options={hiddenDrawerItem} />

        <Drawer.Screen name="ads" options={hiddenDrawerItem} />

        <Drawer.Screen name="advertiser" options={hiddenDrawerItem} />

      </Drawer>
  );

}


