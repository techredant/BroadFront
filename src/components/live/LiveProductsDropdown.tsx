import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fetchSellerListings } from "@/services/marketplaceApi";
import { resolveMediaUrl } from "@/utils/mediaUtils";
import type { MarketplaceProduct } from "@/types/marketplace";

type Props = {
  hostUserId: string;
  topOffset: number;
};

/** Collapsible product list for marketplace live (replaces pinned card + horizontal rail). */
export function LiveProductsDropdown({ hostUserId, topOffset }: Props) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (open) void load();
  }, [open, load]);

  const openProduct = (id: string) => {
    setOpen(false);
    router.push({
      pathname: "/(drawer)/(market)/[id]",
      params: { id },
    } as never);
  };

  return (
    <View style={[styles.wrap, { top: topOffset }]} pointerEvents="box-none">
      {open ? (
        <Pressable
          style={styles.dismiss}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close products menu"
        />
      ) : null}

      <View style={styles.column}>
        <Pressable
          style={styles.trigger}
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Ionicons name="cart-outline" size={16} color="#fff" />
          <Text style={styles.triggerText}>Products</Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={14}
            color="rgba(255,255,255,0.9)"
          />
        </Pressable>

        {open ? (
          <View style={styles.menu}>
            {loading ? (
              <ActivityIndicator color="#FE2C55" style={styles.loader} />
            ) : products.length === 0 ? (
              <Text style={styles.empty}>No listings yet</Text>
            ) : (
              <ScrollView
                style={styles.scroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {products.map((item) => (
                  <Pressable
                    key={item._id}
                    style={styles.row}
                    onPress={() => openProduct(item._id)}
                  >
                    {item.media?.[0] ? (
                      <Image
                        source={{
                          uri: resolveMediaUrl(item.media[0]) ?? item.media[0],
                        }}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <Ionicons name="image-outline" size={18} color="#888" />
                      </View>
                    )}
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowPrice}>
                        KES {item.price.toLocaleString("en-KE")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="rgba(255,255,255,0.45)"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 44,
    elevation: 44,
  },
  dismiss: {
    ...StyleSheet.absoluteFillObject,
    top: -2000,
    bottom: -2000,
    left: -24,
    right: -24,
  },
  column: {
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  triggerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  menu: {
    marginTop: 8,
    width: 280,
    maxHeight: 280,
    borderRadius: 14,
    backgroundColor: "rgba(18,18,18,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  scroll: {
    maxHeight: 280,
  },
  loader: {
    marginVertical: 20,
  },
  empty: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    padding: 16,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  rowPrice: {
    color: "#FE2C55",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
});
