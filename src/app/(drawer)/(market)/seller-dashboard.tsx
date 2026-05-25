import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import {
  fetchSellerAnalytics,
  fetchMarketPlans,
  paySellerSubscription,
} from "@/services/marketplaceApi";
import type { SellerAnalytics, BoostPlan } from "@/types/marketplace";

export default function SellerDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [boostPlans, setBoostPlans] = useState<BoostPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [a, plans] = await Promise.all([
        fetchSellerAnalytics(user.id),
        fetchMarketPlans(),
      ]);
      setAnalytics(a);
      setBoostPlans(plans.boostPlans);
    } catch {
      Alert.alert("Error", "Could not load seller dashboard");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const subscribePremium = async () => {
    if (!user?.id || !phone.trim()) {
      Alert.alert("Phone required", "Enter M-Pesa number");
      return;
    }
    setPaying(true);
    try {
      const res = await paySellerSubscription({
        userId: user.id,
        phoneNumber: phone,
      });
      Alert.alert(
        res.activated ? "Premium activated" : "Payment sent",
        res.activated
          ? "You are now a Premium Seller for 30 days."
          : "Complete M-Pesa on your phone.",
      );
      load();
    } catch {
      Alert.alert("Payment failed", "Try again later");
    } finally {
      setPaying(false);
    }
  };

  if (loading || !analytics) {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  const stats = [
    { label: "Active", value: analytics.activeListings, icon: "cube" },
    { label: "Views", value: analytics.totalViews, icon: "eye" },
    { label: "Saved", value: analytics.totalFavorites, icon: "heart" },
    { label: "Chats", value: analytics.totalChats, icon: "chatbubbles" },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: theme.text }]}>
          Seller Dashboard
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {analytics.isPremiumSeller && (
          <View style={[styles.premiumBanner, { backgroundColor: "#FF6B0020" }]}>
            <Ionicons name="diamond" size={20} color="#FF6B00" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ color: "#FF6B00", fontWeight: "700" }}>
                Premium Seller
              </Text>
              <Text style={{ color: "#FF6B00", fontSize: 12 }}>
                {analytics.premiumStatus?.daysRemaining ?? 0} days remaining
              </Text>
            </View>
          </View>
        )}

        <View style={styles.grid}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: theme.card }]}
            >
              <Ionicons name={s.icon as any} size={22} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {s.value}
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 11 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Seller rating
          </Text>
          <Text style={{ fontSize: 27, fontWeight: "800", color: theme.success }}>
            {analytics.averageRating.toFixed(1)} ★
          </Text>
          <Text style={{ color: theme.subtext }}>
            {analytics.reviewCount} reviews
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Listing quota
          </Text>
          <Text style={{ color: theme.subtext }}>
            {analytics.listingQuota.count} / {analytics.listingQuota.limit} free
            listings used
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.primary,
                  width: `${Math.min(
                    100,
                    (analytics.listingQuota.count / analytics.listingQuota.limit) *
                      100,
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={{ color: theme.subtext, marginTop: 4 }}>
            {analytics.boostedListings} boosted active
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          Boost a listing
        </Text>
        <Text style={{ color: theme.subtext, marginBottom: 8, fontSize: 12 }}>
          Boosted products rank higher until the timer expires.
        </Text>
        {boostPlans.map((plan) => (
          <View
            key={plan.id}
            style={[styles.planRow, { backgroundColor: theme.card }]}
          >
            <View>
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                {plan.label}
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 11 }}>
                KES {plan.amount} · {plan.durationDays} days
              </Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 16 }]}>
          Premium Seller — KES 499 / month
        </Text>
        <TextInput
          placeholder="M-Pesa phone (07...)"
          placeholderTextColor={theme.subtext}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.card },
          ]}
        />
        <TouchableOpacity
          onPress={subscribePremium}
          disabled={paying}
          style={[styles.cta, { backgroundColor: theme.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {paying ? "Processing..." : "Subscribe with M-Pesa"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/verification")}
          style={[styles.ctaOutline, { borderColor: theme.primary }]}
        >
          <Text style={{ color: theme.primary, fontWeight: "600" }}>
            Get verified seller badge
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 18 }]}>
          Product analytics
        </Text>
        {(analytics.products || []).length === 0 ? (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.subtext }}>
              Your listings will appear here with views, saves, chats and boost status.
            </Text>
          </View>
        ) : (
          (analytics.products || []).map((product) => {
            const expiresAt = product.boostExpiresAt
              ? new Date(product.boostExpiresAt)
              : null;
            const daysLeft = expiresAt
              ? Math.max(
                  0,
                  Math.ceil((expiresAt.getTime() - Date.now()) / 86400000),
                )
              : 0;
            return (
              <TouchableOpacity
                key={product._id}
                onPress={() =>
                  router.push({
                    pathname: "/(drawer)/(market)/[id]",
                    params: { id: product._id },
                  } as any)
                }
                style={[styles.productCard, { backgroundColor: theme.card }]}
              >
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontWeight: "800" }}>
                    {product.title}
                  </Text>
                  <Text style={{ color: theme.subtext, fontSize: 12 }}>
                    KES {product.price.toLocaleString("en-KE")} · {product.listingHealth}
                  </Text>
                  <View style={styles.analyticsRow}>
                    <Text style={{ color: theme.subtext, fontSize: 11 }}>
                      {product.views} views
                    </Text>
                    <Text style={{ color: theme.subtext, fontSize: 11 }}>
                      {product.saves} saves
                    </Text>
                    <Text style={{ color: theme.subtext, fontSize: 11 }}>
                      {product.chats} chats
                    </Text>
                  </View>
                </View>
                {product.isPromoted ? (
                  <View style={styles.boostPill}>
                    <Ionicons name="flash" size={12} color="#fff" />
                    <Text style={styles.boostPillText}>{daysLeft}d</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  heading: { fontSize: 17, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 40 },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  statValue: { fontSize: 21, fontWeight: "800" },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardTitle: { fontWeight: "700", marginBottom: 6 },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: { height: "100%", borderRadius: 999 },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  planRow: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cta: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  ctaOutline: {
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  analyticsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  boostPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF6B00",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  boostPillText: { color: "#fff", fontWeight: "800", fontSize: 11 },
});
