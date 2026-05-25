import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { fetchCampaignDetail } from "@/services/adsApi";
import { completeCampaignMpesaPayment } from "@/utils/adPayments";

export default function CampaignDetailScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { user } = useUser();
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !campaignId) return;
    setLoading(true);
    try {
      const detail = await fetchCampaignDetail(user.id, String(campaignId));
      setData(detail);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, campaignId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handlePay = async () => {
    if (!user?.id || !campaignId || !phone.trim()) {
      Alert.alert("Phone required", "Enter your M-Pesa number");
      return;
    }
    setPaying(true);
    try {
      const result = await completeCampaignMpesaPayment(String(campaignId), {
        clerkId: user.id,
        phoneNumber: phone.trim(),
      });

      if (!result.ok) {
        Alert.alert("Payment failed", result.message);
        return;
      }

      Alert.alert(
        "Payment complete",
        result.message ??
          "Your campaign is paid and pending admin approval before it goes live.",
      );
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      Alert.alert("Error", msg);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!data?.campaign) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.subtext }}>Campaign not found</Text>
      </SafeAreaView>
    );
  }

  const { campaign, analytics, ads, payments } = data;
  const totals = analytics?.totals || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.title, { color: theme.text }]}>{campaign.name}</Text>
          <Text style={{ color: theme.subtext, marginTop: 4 }}>
            Status: {campaign.status} · Payment: {campaign.paymentStatus}
          </Text>

          <View style={styles.metrics}>
            {[
              { label: "Impressions", value: totals.impressions ?? 0 },
              { label: "Clicks", value: totals.clicks ?? 0 },
              { label: "CTR %", value: totals.ctr ?? 0 },
              { label: "Spend KES", value: Math.round(totals.spend ?? 0) },
            ].map((m) => (
              <View
                key={m.label}
                style={[styles.metricCard, { backgroundColor: theme.card }]}
              >
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {m.value}
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>{m.label}</Text>
              </View>
            ))}
          </View>

          {campaign.paymentStatus !== "paid" && (
            <View style={[styles.payBox, { backgroundColor: theme.card }]}>
              <Text style={[styles.section, { color: theme.text }]}>
                Complete payment
              </Text>
              <Text style={[styles.payHint, { color: theme.subtext }]}>
                To get the M-Pesa PIN on this phone, enter your Safaricom number
                (07… or +2547…).
              </Text>
              <Text style={[styles.payHint, { color: theme.subtext }]}>
                Sandbox: use 254708374149, tap Pay, then wait ~20 seconds (no PIN
                on your phone is normal — payment auto-confirms on the server).
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="Your M-Pesa 07… or sandbox 254708374149"
                placeholderTextColor={theme.subtext}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!paying}
              />
              {paying ? (
                <View style={styles.waitingRow}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={{ color: theme.subtext, fontSize: 12, flex: 1 }}>
                    Waiting for M-Pesa… check your phone if you used your real
                    number.
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.payBtn,
                  { backgroundColor: theme.primary, opacity: paying ? 0.7 : 1 },
                ]}
                onPress={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Pay KES {campaign.budgetTotal}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {ads?.[0] && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.section, { color: theme.text }]}>
                Creative preview
              </Text>
              <Text style={{ color: theme.subtext }}>{ads[0].caption}</Text>
            </View>
          )}

          {payments?.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.section, { color: theme.text }]}>
                Billing history
              </Text>
              {payments.map((p: { _id: string; invoiceNumber: string; amount: number; status: string }) => (
                <Text key={p._id} style={{ color: theme.subtext, marginTop: 6 }}>
                  {p.invoiceNumber} — KES {p.amount} ({p.status})
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800" },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  metricCard: {
    width: "47%",
    padding: 14,
    borderRadius: 12,
  },
  metricValue: { fontSize: 20, fontWeight: "800" },
  section: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  payBox: { marginTop: 24, padding: 16, borderRadius: 14 },
  payHint: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  payBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
});
