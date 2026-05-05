
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type ExploreUserCardProps = {
  item: {
    clerkId: string;
    image: string | null;
    firstName: string;
    lastName: string;
    nickName: string;
    companyName: string;
  };
  creating: string | null;
  onStartChat: (targetId: string) => void;
};


const ExploreUserCard = ({ item, creating, onStartChat }: ExploreUserCardProps) => {
 const { theme } =useTheme()

 console.log("Item", JSON.stringify(item, null, 2));
  
  
  return (
    <Pressable
      className="flex-row items-center bg-surface rounded-2xl p-3.5 mb-2.5 border border-border gap-3.5"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
      onPress={() => onStartChat(item.clerkId)}
      disabled={creating !== null}
    >
      <Image
        source={item.image ? { uri: item.image } : undefined}
        style={{ width: 48, height: 48, borderRadius: 24 }}
        contentFit="cover"
      />
      <View className="flex-1">
        <Text
          className="text-base font-semibold text-foreground"
          numberOfLines={1}
          style={{ color: theme.text }}
        >
          {item.firstName} {item.lastName}{" "}
          {item.companyName}
        </Text>
        <Text className="text-xs text-foreground-muted mt-0.5">
          {item.nickName}
        </Text>
      </View>

      {creating === item.clerkId ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <View className="w-9 h-9 rounded-xl bg-primary/20 justify-center items-center">
          <Ionicons name="chatbubble" size={16} color={theme.primary} />
        </View>
      )}
    </Pressable>
  );
};

export default ExploreUserCard;
