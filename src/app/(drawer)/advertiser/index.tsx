import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import {
  fetchAdvertiserCampaigns,
  fetchAdvertiserProfile,
  pauseCampaign,
  resumeCampaign,
} from "@/services/adsApi";
import type { AdCampaign } from "@/types/ads";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending_review: "#f59e0b",
  paused: "#94a3b8",
  rejected: "#ef4444",
  completed: "#6366f1",
};

export default function AdvertiserDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const { theme } = useTheme();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [profileRes, list] = await Promise.all([
        fetchAdvertiserProfile(user.id),
        fetchAdvertiserCampaigns(user.id),
      ]);
      setSummary(profileRes.summary);
      setWalletBalance(profileRes.advertiser?.walletBalance ?? 0);
      setCampaigns(list);
    } catch {
      Alert.alert("Error", "Could not load advertiser dashboard");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const togglePause = async (c: AdCampaign) => {
    if (!user?.id) return;
    try {
      if (c.status === "active") {
        await pauseCampaign(c._id, user.id);
      } else if (c.status === "paused") {
        await resumeCampaign(c._id, user.id);
      }
      load();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Action failed");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Ad Manager</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme.primary || "#1e40af" }]}
            onPress={() => router.push("/(drawer)/advertiser/create")}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.createBtnText}>New campaign</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {summary?.activeCampaigns ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              KES {(summary?.totalSpend ?? 0).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>Total spend</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              KES {walletBalance.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>Wallet</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Campaigns</Text>

        {campaigns.length === 0 ? (
          <Text style={{ color: theme.subtext, marginTop: 12 }}>
            No campaigns yet. Create your first promoted post.
          </Text>
        ) : (
          campaigns.map((c) => (
            <TouchableOpacity
              key={c._id}
              style={[styles.campaignCard, { backgroundColor: theme.card }]}
              onPress={() => router.push(`/(drawer)/advertiser/${c._id}`)}
            >
              <View style={styles.campaignTop}>
                <Text style={[styles.campaignName, { color: theme.text }]}>
                  {c.name}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: STATUS_COLORS[c.status] || "#94a3b8" },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {c.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
              <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 6 }}>
                Budget KES {c.budgetTotal?.toLocaleString()} · Spent KES{" "}
                {(c.budgetSpent || 0).toLocaleString()}
              </Text>
              <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
                {c.impressionsDelivered ?? 0} impressions · {c.clicksDelivered ?? 0}{" "}
                clicks
              </Text>
              {(c.status === "active" || c.status === "paused") && (
                <TouchableOpacity
                  style={styles.pauseBtn}
                  onPress={() => togglePause(c)}
                >
                  <Text style={{ color: theme.primary, fontWeight: "600" }}>
                    {c.status === "active" ? "Pause" : "Resume"}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "800" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  createBtnText: { color: "#fff", fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  campaignCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  campaignTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  campaignName: { fontSize: 16, fontWeight: "700", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  pauseBtn: { marginTop: 12, alignSelf: "flex-start" },
});
