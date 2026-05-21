import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Alert, Pressable, Text, View, ScrollView } from "react-native";

const ProfileScreen = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { theme } = useTheme();
  const { userDetails } = useLevel();

  const MENU_ITEMS = [
    {
      icon: "notifications-outline",
      label: "Notifications",
      color: theme.primary,
    },
    { icon: "settings-outline", label: "Settings", color: theme.text },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      {/* <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <Text style={{ fontSize: 25, fontWeight: "700", color: theme.text }}>
          Profile
        </Text>
      </View> */}

      {/* PROFILE CARD */}
      <View style={{ alignItems: "center", paddingVertical: 30 }}>
        <View style={{ position: "relative", marginBottom: 10 }}>
          <Image
            source={userDetails?.image || user?.imageUrl }
            style={{ width: 88, height: 88, borderRadius: 44 }}
            contentFit="cover"
          />

          {/* online dot */}
          <View
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: theme.primary,
              borderWidth: 3,
              borderColor: theme.background,
            }}
          />
        </View>

        <Text style={{ fontSize: 19, fontWeight: "700", color: theme.text }}>
          {userDetails?.firstName || userDetails?.companyName || "user"}
        </Text>

        <Text style={{ fontSize: 12, marginTop: 4, color: theme.subtext }}>
          {userDetails?.nickName}
        </Text>

        {/* streak badge */}
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: theme.card,
          }}
        >
          <Ionicons name="flame" size={16} color={theme.primary} />
          <Text
            style={{ fontSize: 12, fontWeight: "600", color: theme.primary }}
          >
            7 day streak
          </Text>
        </View>
      </View>

      {/* STATS */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Chats", value: "24" },
          { label: "Partners", value: "12" },
          { label: "Chat Time", value: "48h" },
        ].map((item, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 16,
              borderRadius: 16,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{ fontSize: 19, fontWeight: "700", color: theme.primary }}
            >
              {item.value}
            </Text>
            <Text style={{ fontSize: 10, marginTop: 4, color: theme.subtext }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* MENU */}
      <View style={{ paddingHorizontal: 20 }}>
        {MENU_ITEMS.map((item, i) => (
          <Pressable
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              marginBottom: 10,
              borderRadius: 14,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${item.color}20`,
              }}
            >
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>

            <Text
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 14,
                fontWeight: "500",
                color: theme.text,
              }}
            >
              {item.label}
            </Text>

            <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
          </Pressable>
        ))}
      </View>

      {/* SIGN OUT */}
      <Pressable
        onPress={async () => {
          try {
            await signOut();
            Alert.alert("Signed out successfully");
          } catch {
            Alert.alert("Error", "Please try again");
          }
        }}
        style={{
          marginHorizontal: 20,
          marginTop: 10,
          marginBottom: 30,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#ff4d4f40",
          backgroundColor: theme.card,
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#ff4d4f" />
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#ff4d4f" }}>
          Sign Out
        </Text>
      </Pressable>
    </ScrollView>
  );
};

export default ProfileScreen;
