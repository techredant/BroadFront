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
import { router } from "expo-router";
import { fetchSellerListings } from "@/services/marketplaceApi";
import type { MarketplaceProduct } from "@/types/marketplace";

type Props = {
  hostUserId: string;
  featuredProductId?: string;
  bottomOffset: number;
};

export function MarketLiveProductRail({
  hostUserId,
  featuredProductId,
  bottomOffset,
}: Props) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hostUserId) return;
    setLoading(true);
    try {
      const list = await fetchSellerListings(hostUserId, 12);
      const sorted = [...list].sort((a, b) => {
        if (a._id === featuredProductId) return -1;
        if (b._id === featuredProductId) return 1;
        return 0;
      });
      setProducts(sorted);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [featuredProductId, hostUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.wrap, { bottom: bottomOffset }]}>
        <ActivityIndicator color="#fff" size="small" />
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Shop this live</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {products.map((item) => {
            const featured = item._id === featuredProductId;
            return (
              <Pressable
                key={item._id}
                onPress={() => router.push(`/(drawer)/(market)/${item._id}`)}
                style={[styles.card, featured && styles.cardFeatured]}
              >
                {item.media?.[0] ? (
                  <Image
                    source={{ uri: item.media[0] }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]} />
                )}
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>
                    KES {item.price.toLocaleString("en-KE")}
                  </Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {featured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredText}>LIVE</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const CARD_W = 132;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 42,
    elevation: 42,
  },
  panel: {
    marginHorizontal: 12,
    backgroundColor: "rgba(18,18,18,0.88)",
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  panelTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 12,
    marginBottom: 8,
  },
  rail: {
    paddingHorizontal: 12,
    gap: 10,
  },
  card: {
    width: CARD_W,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardFeatured: {
    borderColor: "#FE2C55",
    borderWidth: 2,
  },
  thumb: {
    width: CARD_W,
    height: 88,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  thumbEmpty: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  priceTag: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "800",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 8,
    lineHeight: 14,
  },
  featuredBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FE2C55",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
});
