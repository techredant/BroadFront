import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { fetchSellerListings } from "@/services/marketplaceApi";
import { resolveMediaUrl } from "@/utils/mediaUtils";
import type { MarketplaceProduct } from "@/types/marketplace";
import type { MarketLiveProduct } from "@/utils/marketLive";

type Props = {
  visible: boolean;
  hostUserId: string;
  pinnedProductId?: string;
  onClose: () => void;
  onPin: (product: MarketLiveProduct) => void;
  onUnpin: () => void;
};

export function LivePinProductSheet({
  visible,
  hostUserId,
  pinnedProductId,
  onClose,
  onPin,
  onUnpin,
}: Props) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const translateY = useSharedValue(400);

  const load = useCallback(async () => {
    if (!hostUserId) return;
    setLoading(true);
    try {
      const list = await fetchSellerListings(hostUserId, 24);
      setProducts(list);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [hostUserId]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 400, {
      damping: 22,
      stiffness: 220,
    });
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>Pin product</Text>
            <Text style={styles.subtitle}>
              Highlight a product for all viewers
            </Text>

            {pinnedProductId ? (
              <Pressable style={styles.unpinBtn} onPress={onUnpin}>
                <Ionicons name="pin" size={18} color="#FE2C55" />
                <Text style={styles.unpinText}>Remove pinned product</Text>
              </Pressable>
            ) : null}

            {loading ? (
              <ActivityIndicator
                color="#FE2C55"
                style={{ marginVertical: 24 }}
              />
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => item._id}
                style={styles.list}
                renderItem={({ item }) => {
                  const pinned = item._id === pinnedProductId;
                  return (
                    <Pressable
                      style={[styles.row, pinned && styles.rowPinned]}
                      onPress={() =>
                        onPin({
                          productId: item._id,
                          title: item.title,
                          price: item.price,
                          image: item.media?.[0],
                        })
                      }
                    >
                      <Image
                        source={{
                          uri:
                            resolveMediaUrl(item.media?.[0]) ??
                            item.media?.[0],
                        }}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                      <View style={styles.meta}>
                        <Text style={styles.name} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.price}>
                          KES {item.price.toLocaleString("en-KE")}
                        </Text>
                      </View>
                      {pinned ? (
                        <Ionicons name="checkmark-circle" size={22} color="#FE2C55" />
                      ) : (
                        <Ionicons name="pin-outline" size={20} color="rgba(255,255,255,0.4)" />
                      )}
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: "75%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  subtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  unpinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  unpinText: { color: "#FE2C55", fontWeight: "700", fontSize: 14 },
  list: { maxHeight: 400 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  rowPinned: {
    backgroundColor: "rgba(254,44,85,0.08)",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  meta: { flex: 1, minWidth: 0 },
  name: { color: "#fff", fontWeight: "700", fontSize: 14 },
  price: {
    color: "#4ADE80",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 4,
  },
});
