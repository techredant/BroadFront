import { COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { UserResponse } from "stream-chat";

type ExploreUserCardProps = {
  item: {
    clerkId: string;
    image: String | null;
    firstName: String;
    lastName: String;
    nickName: String;
  };
  creating: string | null;
  onStartChat: (targetId: string) => void;
};


const ExploreUserCard = ({ item, creating, onStartChat }: ExploreUserCardProps) => {
 
  
  return (
    <Pressable
      className="flex-row items-center bg-surface rounded-2xl p-3.5 mb-2.5 border border-border gap-3.5"
      onPress={() => onStartChat(item.clerkId)}
      disabled={creating !== null}
    >
      <Image
        source={item.image}
        style={{ width: 48, height: 48, borderRadius: 24 }}
        contentFit="cover"
      />

      {/* User info */}
      <View className="flex-1">
        <Text
          className="text-base font-semibold text-foreground"
          numberOfLines={1}
        >
          {item.firstName || item.clerkId}
        </Text>
        <Text className="text-xs text-foreground-muted mt-0.5">
          {item.nickName}
        </Text>
      </View>

      {creating === item.clerkId ? (
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
