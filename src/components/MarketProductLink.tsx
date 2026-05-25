import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

type Props = {
  productId: string;
  title?: string;
  price?: number;
};

export function MarketProductLink({ productId, title, price }: Props) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/(drawer)/(market)/${productId}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 6,
        borderRadius: 12,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="storefront-outline" size={20} color={theme.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>
          View product
        </Text>
        {title ? (
          <Text
            numberOfLines={1}
            style={{ color: theme.text, fontSize: 12, marginTop: 2 }}
          >
            {title}
          </Text>
        ) : null}
        {price != null ? (
          <Text style={{ color: theme.subtext, fontSize: 11, marginTop: 2 }}>
            KES {Number(price).toLocaleString("en-KE")}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
    </Pressable>
  );
}
