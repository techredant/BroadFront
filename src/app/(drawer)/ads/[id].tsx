import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { fetchAdDetail, trackAdClick } from "@/services/adsApi";

export default function AdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const { theme, isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await fetchAdDetail(String(id), user?.id);
      setData(detail);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCta = async () => {
    if (!data) return;
    const res = await trackAdClick(data._id, {
      viewerClerkId: user?.id,
      clickType: "cta",
    });
    const url = res?.ctaUrl || data.ctaUrl;
    if (data.productId) {
      router.push(`/(drawer)/(market)/${data.productId}`);
    } else if (url) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.subtext }}>Ad not found</Text>
      </View>
    );
  }

  const mainImage = data.media?.[0]?.url;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>

      <View style={styles.profileRow}>
        {data.businessLogo ? (
          <Image source={{ uri: data.businessLogo }} style={styles.logo} />
        ) : null}
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.title, { color: theme.text }]}>
              {data.businessName}
            </Text>
            <VerifiedBadge isVerified={data.isVerified} size={16} />
          </View>
          <Text style={{ color: theme.subtext, fontSize: 13 }}>
            {data.label || "Sponsored"}
          </Text>
        </View>
      </View>

      {mainImage && (
        <Image source={{ uri: mainImage }} style={styles.hero} resizeMode="cover" />
      )}

      {!!data.caption && (
        <Text style={[styles.caption, { color: theme.text }]}>{data.caption}</Text>
      )}

      <Pressable
        style={[styles.cta, { backgroundColor: theme.primary || "#1e40af" }]}
        onPress={handleCta}
      >
        <Text style={styles.ctaText}>{data.ctaLabel || "Learn More"}</Text>
      </Pressable>

      {data.relatedProducts?.length > 0 && (
        <View style={styles.related}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Related products
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {data.relatedProducts.map((p: any) => (
              <Pressable
                key={p._id}
                style={[
                  styles.productCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isDark ? "#333" : "#eee",
                  },
                ]}
                onPress={() => router.push(`/(drawer)/(market)/${p._id}`)}
              >
                {p.images?.[0] && (
                  <Image
                    source={{ uri: p.images[0] }}
                    style={styles.productImage}
                  />
                )}
                <Text
                  numberOfLines={2}
                  style={{ color: theme.text, fontSize: 13, padding: 8 }}
                >
                  {p.title}
                </Text>
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: "700",
                    paddingHorizontal: 8,
                    paddingBottom: 8,
                  }}
                >
                  KES {p.price?.toLocaleString?.() ?? p.price}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { padding: 16, paddingTop: 48 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  logo: { width: 56, height: 56, borderRadius: 28 },
  title: { fontSize: 20, fontWeight: "700" },
  hero: { width: "100%", height: 280 },
  caption: {
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
  },
  cta: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  related: { marginTop: 24, paddingLeft: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  productCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  productImage: { width: 160, height: 120 },
});
