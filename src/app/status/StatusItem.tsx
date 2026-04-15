import { View, Text, Image, Pressable, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useRef } from "react";

interface StatusItemProps {
  userStatus: {
    user: { name: string; avatar: string };
    statuses: { id: string; viewed: boolean }[];
  };
}

export function StatusItem({ userStatus }: StatusItemProps) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const hasUnviewed = userStatus.statuses.some((s) => !s.viewed);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={() => router.push(`/status/Viewer?user=${userStatus.user.name}`)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={10}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
        }}
      >
        <View
          style={{
            padding: 3,
            borderRadius: 50,
            backgroundColor: hasUnviewed ? "transparent" : "#1F2937",
          }}
        >
          <Image
            source={{ uri: userStatus.user.avatar }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              opacity: hasUnviewed ? 1 : 0.6,
              borderWidth: hasUnviewed ? 2 : 0,
              borderColor: hasUnviewed ? "#1d4ed8" : "transparent",
            }}
          />
        </View>
      </Animated.View>

      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          marginTop: 6,
          maxWidth: 60,
          textAlign: "center",
          color: "#111",
          fontWeight: "bold",
        }}
      >
        {userStatus.user.name}
      </Text>
    </Pressable>
  );
}
