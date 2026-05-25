import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { MarketLiveProduct } from "@/utils/marketLive";
import { resolveMediaUrl } from "@/utils/mediaUtils";

type Props = {
  product: MarketLiveProduct;
  bottomOffset: number;
  isHost?: boolean;
  onPinPress?: () => void;
};

export function LiveProductOverlay({
  product,
  bottomOffset,
  isHost,
  onPinPress,
}: Props) {
  const openProduct = () => {
    router.push(`/(drawer)/(market)/${product.productId}`);
  };

  return (
    <View
      style={[styles.wrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <Pressable onPress={openProduct} style={styles.main}>
          {product.image ? (
            <Image
              source={{ uri: resolveMediaUrl(product.image) ?? product.image }}
              style={styles.thumb}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="cart-outline" size={22} color="#fff" />
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>Pinned</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {product.title}
            </Text>
            <Text style={styles.price}>
              KES {product.price.toLocaleString("en-KE")}
            </Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          {isHost && onPinPress ? (
            <Pressable style={styles.changeBtn} onPress={onPinPress}>
              <Text style={styles.changeText}>Change</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.ctaBtn} onPress={openProduct}>
            <Text style={styles.ctaText}>
              {isHost ? "View" : "Buy now"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 88,
    zIndex: 41,
    elevation: 41,
  },
  card: {
    backgroundColor: "rgba(12,12,12,0.88)",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(254,44,85,0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  main: {
    flexDirection: "row",
    gap: 10,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, justifyContent: "center" },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FE2C55",
  },
  liveTagText: {
    color: "#FE2C55",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  price: {
    color: "#4ADE80",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  changeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  changeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  ctaBtn: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FE2C55",
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
