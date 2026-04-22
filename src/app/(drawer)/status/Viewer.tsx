import { View, Text, Pressable, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "react-native";
import Video from "react-native-video";

const { width } = Dimensions.get("window");

export default function StatusViewer() {
  const router = useRouter();
  const { user } = useLocalSearchParams();

  // 🔥 Normally this comes from context / store / backend
  const allStatuses = require("@/assets/data/SampleStatuses.json");

  // group statuses
  const grouped = Object.values(
    allStatuses.reduce(
      (
        acc: { [x: string]: { user: any; statuses: any[] } },
        status: { user: { name: any } },
      ) => {
        const key = status.user.name;
        if (!acc[key]) acc[key] = { user: status.user, statuses: [] };
        acc[key].statuses.push(status);
        return acc;
      },
      {},
    ),
  );

  const userIndex = grouped.findIndex((u: any) => u.user.name === user);

  const [currentUserIndex, setCurrentUserIndex] = useState(userIndex);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  const currentUser = grouped[currentUserIndex] as any;
  const currentStatus = currentUser?.statuses[currentStatusIndex];

  // ⏱ auto advance
  useEffect(() => {
    const timer = setTimeout(nextStatus, 5000);
    return () => clearTimeout(timer);
  }, [currentStatusIndex, currentUserIndex]);

  function nextStatus() {
    if (currentStatusIndex < currentUser?.statuses?.length - 1) {
      setCurrentStatusIndex((i) => i + 1);
    } else if (currentUserIndex < grouped.length - 1) {
      setCurrentUserIndex((i) => i + 1);
      setCurrentStatusIndex(0);
    } else {
      router.back();
    }
  }

  function prevStatus() {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex((i) => i - 1);
    } else if (currentUserIndex > 0) {
      const prevUser = grouped[currentUserIndex - 1] as any;
      setCurrentUserIndex((i) => i - 1);
      setCurrentStatusIndex(prevUser?.statuses.length - 1);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Progress bars */}
      <View style={{ flexDirection: "row", padding: 8, gap: 4 }}>
        {currentUser?.statuses.map((_: any, i: number) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 2,
              backgroundColor:
                i <= currentStatusIndex ? "#fff" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        {currentStatus?.content.type === "image" && (
          <Image
            source={{ uri: currentStatus?.content.url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        )}

        {currentStatus?.content.type === "video" && (
          <Video
            source={{ uri: currentStatus?.content.url }}
            style={{ width: "100%", height: "100%" }}
          />
        )}

        {currentStatus?.content.type === "text" && (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: currentStatus?.content.background,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 22, padding: 24 }}>
              {currentStatus?.content.text}
            </Text>
          </View>
        )}
      </View>

      {/* Tap zones */}
      <View
        style={{
          position: "absolute",
          flexDirection: "row",
          width: "100%",
          height: "100%",
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={prevStatus} />
        <Pressable style={{ flex: 1 }} onPress={nextStatus} />
      </View>
    </View>
  );
}
