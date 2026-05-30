import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import {
  completeHostAccessPayment,
  fetchHostAccessPlans,
  type HostAccessPlan,
  type LiveStreamKind,
} from "@/utils/liveHostPayments";

export type LiveHostPaywallMeta = {
  roomTitle?: string;
  level?: string;
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
};

type Props = {
  callId: string;
  streamKind: LiveStreamKind;
  clerkId: string;
  meta: LiveHostPaywallMeta;
  onPaid: () => void;
  onCancel: () => void;
};

export function LiveHostPaywall({
  callId,
  streamKind,
  clerkId,
  meta,
  onPaid,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<HostAccessPlan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchHostAccessPlans()
      .then((plans) => {
        const match = plans.find((p) => p.id === streamKind);
        setPlan(match ?? plans[0] ?? null);
      })
      .catch(() => Alert.alert("Error", "Could not load live pricing"))
      .finally(() => setLoadingPlans(false));
  }, [streamKind]);

  const handlePay = async () => {
    if (!phone.trim()) {
      Alert.alert("Phone required", "Enter your M-Pesa number to go live.");
      return;
    }

    setPaying(true);
    try {
      const result = await completeHostAccessPayment({
        clerkId,
        callId,
        streamKind,
        phoneNumber: phone.trim(),
        roomTitle: meta.roomTitle,
        productId: meta.productId,
      });

      if (!result.ok) {
        Alert.alert("Payment failed", result.message);
        return;
      }

      onPaid();
    } catch (err) {
      Alert.alert(
        "Payment failed",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setPaying(false);
    }
  };

  const title =
    meta.roomTitle ||
    (streamKind === "market" ? "Market live" : "Community live");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onCancel} hitSlop={12} disabled={paying}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: theme.text }]}>Go live</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={[styles.hero, { backgroundColor: theme.card }]}>
          <Ionicons name="videocam" size={36} color="#FE2C55" />
          <Text style={[styles.heroTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 6 }}>
            Pay once to start broadcasting. Viewers join for free.
          </Text>
        </View>

        {loadingPlans ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={theme.primary} />
        ) : plan ? (
          <View style={[styles.planCard, { borderColor: theme.primary }]}>
            <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16 }}>
              {plan.label}
            </Text>
            <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
              {plan.description}
            </Text>
            <Text
              style={{
                color: theme.primary,
                fontWeight: "900",
                fontSize: 22,
                marginTop: 12,
              }}
            >
              {plan.currency} {plan.amount}
            </Text>
          </View>
        ) : null}

        <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18 }}>
          Sandbox: use 254708374149 and wait ~20s (PIN may not appear on your
          phone). Audio rooms do not require this fee.
        </Text>

        <Text style={[styles.label, { color: theme.text }]}>M-Pesa phone</Text>
        <TextInput
          placeholder="07XX XXX XXX"
          placeholderTextColor={theme.subtext}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!paying}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border },
          ]}
        />

        {paying ? (
          <View style={styles.waitRow}>
            <ActivityIndicator color={theme.primary} />
            <Text style={{ color: theme.subtext, fontSize: 12, flex: 1 }}>
              Waiting for M-Pesa confirmation…
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.payBtn,
            { backgroundColor: "#FE2C55", opacity: paying ? 0.7 : 1 },
          ]}
          onPress={handlePay}
          disabled={paying || loadingPlans}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>
              Pay {plan ? `KES ${plan.amount}` : ""} & go live
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 18, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  label: { fontWeight: "700", marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  waitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  payBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  payBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
