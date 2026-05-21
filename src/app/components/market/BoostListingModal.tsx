import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { fetchMarketPlans, payBoost } from "@/services/marketplaceApi";
import type { BoostPlan } from "@/types/marketplace";

type Props = {
  visible: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  onSuccess?: () => void;
  theme: {
    card: string;
    text: string;
    subtext: string;
    border: string;
    primary: string;
    background: string;
  };
};

export function BoostListingModal({
  visible,
  onClose,
  productId,
  productTitle,
  onSuccess,
  theme,
}: Props) {
  const { user } = useUser();
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoadingPlans(true);
    fetchMarketPlans()
      .then((data) => {
        setPlans(data.boostPlans);
        if (data.boostPlans.length > 0) {
          setSelectedPlan(data.boostPlans[0].id);
        }
      })
      .catch(() => Alert.alert("Error", "Could not load boost plans"))
      .finally(() => setLoadingPlans(false));
  }, [visible]);

  const handlePay = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to boost your listing.");
      return;
    }
    if (!selectedPlan) {
      Alert.alert("Select a plan", "Choose a boost duration.");
      return;
    }
    if (!/^(\+254|0)[0-9]{9}$/.test(phone.trim())) {
      Alert.alert("Invalid phone", "Enter a valid Kenyan M-Pesa number (07...).");
      return;
    }

    setLoading(true);
    try {
      const res = await payBoost({
        productId,
        userId: user.id,
        planId: selectedPlan,
        phoneNumber: phone.trim(),
      });

      if (res.activated) {
        Alert.alert(
          "Boost active",
          "Your listing is now promoted and will rank higher in search.",
        );
        onSuccess?.();
        onClose();
      } else {
        Alert.alert(
          "Payment sent",
          "Complete the M-Pesa prompt on your phone. Your listing will be promoted once payment is confirmed.",
        );
        onClose();
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null;
      Alert.alert("Payment failed", msg || "Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Ionicons name="flash" size={22} color="#FF6B00" />
              <Text style={[styles.title, { color: theme.text }]}>
                Boost listing
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.subtext }]} numberOfLines={2}>
            {productTitle}
          </Text>
          <Text style={[styles.hint, { color: theme.subtext }]}>
            Boosted listings appear in Promoted and rank higher until the timer
            expires.
          </Text>

          {loadingPlans ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={theme.primary} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {plans.map((plan) => {
                const selected = selectedPlan === plan.id;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    onPress={() => setSelectedPlan(plan.id)}
                    style={[
                      styles.planCard,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected
                          ? `${theme.primary}12`
                          : theme.background,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planLabel, { color: theme.text }]}>
                        {plan.label}
                      </Text>
                      <Text style={{ color: theme.subtext, fontSize: 12 }}>
                        {plan.durationDays} days · higher visibility
                      </Text>
                    </View>
                    <Text style={[styles.planPrice, { color: theme.primary }]}>
                      KES {plan.amount}
                    </Text>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.primary}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.inputLabel, { color: theme.text }]}>
                M-Pesa phone number
              </Text>
              <TextInput
                placeholder="07XX XXX XXX"
                placeholderTextColor={theme.subtext}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border },
                ]}
              />
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={handlePay}
            disabled={loading || loadingPlans}
            style={[
              styles.payBtn,
              {
                backgroundColor: theme.primary,
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>Pay with M-Pesa</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 19, fontWeight: "800" },
  subtitle: { marginTop: 8, fontSize: 14, fontWeight: "600" },
  hint: { fontSize: 12, marginTop: 6, marginBottom: 16, lineHeight: 18 },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 10,
  },
  planLabel: { fontWeight: "700", fontSize: 14 },
  planPrice: { fontWeight: "800", fontSize: 15 },
  inputLabel: { fontWeight: "600", marginTop: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  payBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  payBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
