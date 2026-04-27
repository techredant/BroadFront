import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useRouter } from "expo-router";
import moment from "moment";
import Video from "react-native-video";

function Ring({ count, viewed }: any) {
  const size = 60;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const segment = circumference / Math.max(count, 1);

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Defs>
        {/* WhatsApp green gradient */}
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#E5E7EB" />
          <Stop offset="100%" stopColor="#128C7E" />
        </LinearGradient>
      </Defs>

      {/* base ring (seen = gray, unseen = green) */}
      <Circle
        cx={30}
        cy={30}
        r={radius}
        stroke={viewed ? "#D1D5DB" : "#E5E7EB"}
        strokeWidth={3}
        fill="none"
      />

      {Array.from({ length: count }).map((_, i) => (
        <Circle
          key={i}
          cx={30}
          cy={30}
          r={radius}
          stroke="url(#g)"
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${segment - 3} ${circumference}`}
          strokeDashoffset={-i * segment}
          transform="rotate(-90 30 30)"
        />
      ))}
    </Svg>
  );
}

export default function StatusItem({ userStatus }: any) {
  const router = useRouter();

  const latest = userStatus.statuses?.[0];

  const viewed = latest?.views?.length > 0;

   const hasMedia = latest?.media?.length > 0;

  const firstMedia = latest?.media?.[0];


  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/(status)/Viewer?user=${userStatus.userId}`)}
    >
      {/* LEFT: Avatar + Ring */}
      <View style={styles.avatarWrap}>
        {latest ? (
          hasMedia ? (
            firstMedia?.includes(".mp4") ? (
              <Video
                source={{ uri: firstMedia }}
                style={styles.media}
                resizeMode="cover"
                muted
                repeat
              />
            ) : (
              <Image source={{ uri: firstMedia }} style={styles.media} />
            )
          ) : (
            <View
              style={[
                styles.textBackground,
                {
                  backgroundColor: latest.backgroundColor || "#1e293b",
                },
              ]}
            >
              <Text style={styles.textOnly} numberOfLines={2}>
                {latest.caption}
              </Text>
            </View>
          )
        ) : null}
        <Ring count={userStatus.statuses.length} viewed={viewed} />
      </View>

      {/* MIDDLE: TEXT */}
      <View style={styles.middle}>
        <Text style={styles.name}>{userStatus.firstName || "Unknown"}</Text>

        <Text style={styles.caption} numberOfLines={1}>
          {latest?.caption || "No status updates"}
        </Text>
      </View>

      {/* RIGHT: TIME */}
      <View>
        <Text style={styles.time}>
          {moment(userStatus.createdAt).fromNow()}
        </Text>
        <Text style={styles.time}>{userStatus.statuses.length} status</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  avatarWrap: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "relative", // IMPORTANT
  },

  textOnly: {
    color: "#fff",
    fontSize: 10,
    textAlign: "center",
    paddingHorizontal: 4,
    fontWeight: "600",
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: "absolute",
  },

  textBackground: {
    width: 49,
    height: 49,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },

  placeholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E7EB",
    position: "absolute",
  },

  middle: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  caption: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  media: {
    width: 49,
    height: 49,
    borderRadius: 29,
    position: "absolute",
  },

  time: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
