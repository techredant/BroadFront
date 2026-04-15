import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { UserResponse } from "stream-chat";

type ExploreUserCardProps = {
  item: UserResponse;
  creating: string | null;
  onStartChat: (targetId: string) => void;
};

const ExploreUserCard = ({ item, creating, onStartChat }: ExploreUserCardProps) => {
  return (
    <Pressable
      className="flex-row items-center bg-surface rounded-2xl p-3.5 mb-2.5 border border-border gap-3.5"
      onPress={() => onStartChat(item.id)}
      disabled={creating !== null}
    >
      <Image
        source={item.image}
        style={{ width: 48, height: 48, borderRadius: 24 }}
        contentFit="cover"
      />

      {item.online && (
        <View className="w-3 h-3 rounded-full bg-accent-secondary absolute left-[50px] top-[46px] border-2 border-surface" />
      )}

      {/* User info */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {item.name || item.id}
        </Text>
        <Text className="text-xs text-foreground-muted mt-0.5">
          {item.online ? "Online" : "Offline"}
        </Text>
      </View>

      {creating === item.id ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <View className="w-9 h-9 rounded-xl bg-primary/20 justify-center items-center">
          <Ionicons name="chatbubble" size={16} color={COLORS.primary} />
        </View>
      )}
    </Pressable>
  );
};

export default ExploreUserCard;
