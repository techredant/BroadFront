import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import type { MarketplaceProduct } from "@/types/marketplace";

type Props = {
  item: MarketplaceProduct;
  theme: {
    card: string;
    text: string;
    success?: string;
    badge?: string;
    primary: string;
    subtext: string;
  };
  onPress: () => void;
  index?: number;
  compact?: boolean;
};

export function ProductCard({
  item,
  theme,
  onPress,
  index = 0,
  compact = false,
}: Props) {
  const mediaUrl =
    item.media?.[0] || "https://via.placeholder.com/300x300?text=No+Image";
  const isBoosted =
    item.isPromoted &&
    item.boostExpiresAt &&
    new Date(item.boostExpiresAt) > new Date();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: theme.card },
        compact && styles.cardCompact,
      ]}
    >
      <Animated.View entering={FadeInUp.delay(index * 40).duration(350)}>
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: mediaUrl }}
            style={[styles.media, compact && styles.mediaCompact]}
            contentFit="cover"
            transition={200}
          />
          {isBoosted && (
            <View style={styles.promotedBadge}>
              <Ionicons name="flash" size={10} color="#fff" />
              <Text style={styles.promotedText}>Promoted</Text>
            </View>
          )}
          {item.condition === "new" && (
            <View style={[styles.conditionBadge, { right: isBoosted ? 72 : 8 }]}>
              <Text style={styles.conditionText}>New</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text
            numberOfLines={2}
            style={[styles.title, { color: theme.text }]}
          >
            {item.title}
          </Text>

          <Text style={[styles.price, { color: theme.success ?? "#28a745" }]}>
            KES {(item.price || 0).toLocaleString("en-KE")}
          </Text>

          <View style={styles.sellerRow}>
            {item.seller?.isVerified && (
              <VerifiedBadge isVerified size={12} />
            )}
            <Text
              numberOfLines={1}
              style={[styles.sellerName, { color: theme.subtext }]}
            >
              {item.seller?.name || "Seller"}
            </Text>
            {item.seller?.ratingCount ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color="#F5A623" />
                <Text style={[styles.rating, { color: theme.subtext }]}>
                  {item.seller.ratingAvg.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.catBadge, { backgroundColor: theme.badge }]}>
            <Text style={{ fontSize: 10, color: theme.text }}>
              {item.category}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardCompact: {
    width: 160,
    flex: 0,
    marginRight: 12,
  },
  imageWrap: { position: "relative" },
  media: { width: "100%", height: 160 },
  mediaCompact: { height: 140 },
  promotedBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF6B00",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promotedText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  conditionBadge: {
    position: "absolute",
    top: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  conditionText: { color: "#fff", fontSize: 9, fontWeight: "600" },
  body: { padding: 10 },
  title: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  price: { fontWeight: "800", marginTop: 4, fontSize: 14 },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  sellerName: { flex: 1, fontSize: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  rating: { fontSize: 10 },
  catBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
});
