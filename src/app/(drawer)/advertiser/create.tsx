import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { createAdCampaign, fetchAdConfig, payForCampaign } from "@/services/adsApi";
import { completeCampaignMpesaPayment } from "@/utils/adPayments";
import type { BudgetPlan } from "@/types/ads";

const CTA_OPTIONS = [
  { id: "shop_now", label: "Shop Now" },
  { id: "learn_more", label: "Learn More" },
  { id: "visit_website", label: "Visit Website" },
  { id: "contact_us", label: "Contact Us" },
  { id: "download", label: "Download" },
  { id: "install_app", label: "Install App" },
];

export default function CreateAdCampaign() {
  const router = useRouter();
  const { user } = useUser();
  const { theme } = useTheme();
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [planId, setPlanId] = useState("starter");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaType, setCtaType] = useState("learn_more");
  const [budget, setBudget] = useState("500");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "wallet">("mpesa");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAdConfig().then((cfg) => {
      setPlans(cfg.budgetPlans);
      if (cfg.budgetPlans[0]) {
        setPlanId(cfg.budgetPlans[0].id);
        setBudget(String(cfg.budgetPlans[0].minBudget));
      }
    });
  }, []);

  const selectedPlan = plans.find((p) => p.id === planId);

  const submit = async () => {
    if (!user?.id || !name.trim() || !businessName.trim()) {
      Alert.alert("Missing fields", "Campaign name and business name are required.");
      return;
    }
    if (!mediaUrl.trim()) {
      Alert.alert("Media required", "Add an image URL for your ad creative.");
      return;
    }

    const budgetNum = Number(budget);
    if (selectedPlan && budgetNum < selectedPlan.minBudget) {
      Alert.alert("Budget too low", `Minimum is KES ${selectedPlan.minBudget}`);
      return;
    }

    setSubmitting(true);
    try {
      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setDate(
        endsAt.getDate() + (selectedPlan?.maxDurationDays || 7),
      );

      const { campaign } = await createAdCampaign({
        clerkId: user.id,
        campaign: {
          name,
          budgetTotal: budgetNum,
          planId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          targeting: {
            countries: ["Kenya"],
            interests: [],
          },
        },
        creative: {
          businessName,
          caption,
          mediaType: "image",
          media: [{ url: mediaUrl.trim(), type: "image" }],
          ctaType,
          ctaUrl: ctaUrl.trim() || undefined,
          label: "Sponsored",
        },
      });

      if (paymentMethod === "mpesa") {
        if (!phone.trim()) {
          Alert.alert(
            "Campaign created",
            "Pay with M-Pesa from campaign details.",
          );
          router.replace(`/(drawer)/advertiser/${campaign._id}`);
          return;
        }

        const payRes = await completeCampaignMpesaPayment(campaign._id, {
          clerkId: user.id,
          phoneNumber: phone.trim(),
        });

        if (!payRes.ok) {
          Alert.alert("Payment failed", payRes.message);
          router.replace(`/(drawer)/advertiser/${campaign._id}`);
          return;
        }

        Alert.alert(
          "Paid & pending review",
          payRes.message ?? "Your ad will go live after admin approval.",
        );
      } else {
        const payRes = await payForCampaign(campaign._id, {
          clerkId: user.id,
          method: "wallet",
        });
        Alert.alert(
          payRes.activated ? "Paid & pending review" : "Payment issue",
          payRes.activated
            ? "Your ad will go live after admin approval."
            : "Could not charge wallet.",
        );
      }
      router.replace(`/(drawer)/advertiser/${campaign._id}`);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.errorMessage ||
        e?.message ||
        "Could not create campaign";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={[styles.title, { color: theme.text }]}>Create campaign</Text>

        <Text style={[styles.label, { color: theme.subtext }]}>Plan</Text>
        <View style={styles.planRow}>
          {plans.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.planChip,
                {
                  backgroundColor: planId === p.id ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => {
                setPlanId(p.id);
                setBudget(String(p.minBudget));
              }}
            >
              <Text
                style={{
                  color: planId === p.id ? "#fff" : theme.text,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {[
          { label: "Campaign name", value: name, set: setName },
          { label: "Business name", value: businessName, set: setBusinessName },
          { label: "Caption", value: caption, set: setCaption, multiline: true },
          { label: "Image URL", value: mediaUrl, set: setMediaUrl },
          { label: "CTA link (optional)", value: ctaUrl, set: setCtaUrl },
          { label: "Budget (KES)", value: budget, set: setBudget, keyboard: "numeric" },
          { label: "M-Pesa phone", value: phone, set: setPhone, keyboard: "phone-pad" },
        ].map((field) => (
          <View key={field.label} style={{ marginTop: 14 }}>
            <Text style={[styles.label, { color: theme.subtext }]}>{field.label}</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={field.value}
              onChangeText={field.set}
              multiline={field.multiline}
              keyboardType={field.keyboard as any}
              placeholderTextColor={theme.subtext}
            />
          </View>
        ))}

        <Text style={[styles.label, { color: theme.subtext, marginTop: 14 }]}>
          Call to action
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CTA_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.planChip,
                {
                  marginRight: 8,
                  backgroundColor: ctaType === c.id ? theme.primary : theme.card,
                },
              ]}
              onPress={() => setCtaType(c.id)}
            >
              <Text style={{ color: ctaType === c.id ? "#fff" : theme.text }}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.payRow}>
          {(["mpesa", "wallet"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.planChip,
                {
                  flex: 1,
                  backgroundColor:
                    paymentMethod === m ? theme.primary : theme.card,
                },
              ]}
              onPress={() => setPaymentMethod(m)}
            >
              <Text
                style={{
                  color: paymentMethod === m ? "#fff" : theme.text,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                {m === "mpesa" ? "M-Pesa" : "Wallet"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submit, { backgroundColor: theme.primary || "#1e40af" }]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create & pay</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  label: { fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  planRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  planChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  payRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  submit: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
