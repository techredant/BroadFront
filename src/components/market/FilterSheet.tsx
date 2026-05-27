import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import type { ProductCondition, ProductFilters, SortOption } from "@/types/marketplace";
import { MARKET_CATEGORIES } from "@/services/marketplaceApi";

type Props = {
  visible: boolean;
  onClose: () => void;
  filters: ProductFilters;
  onApply: (f: ProductFilters) => void;
  theme: Record<string, string>;
};

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "relevance", label: "Recommended" },
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Most popular" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
];

export function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  theme,
}: Props) {
  const [local, setLocal] = React.useState<ProductFilters>(filters);

  React.useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: theme.text }]}>Filters</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: theme.subtext }]}>Sort by</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setLocal((p) => ({ ...p, sort: opt.id }))}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        local.sort === opt.id ? "#4caf50" : theme.background,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: local.sort === opt.id ? "#fff" : theme.text,
                      fontSize: 12,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.subtext }]}>Price (KES)</Text>
            <View style={styles.priceRow}>
              <TextInput
                placeholder="Min"
                placeholderTextColor={theme.subtext}
                keyboardType="numeric"
                value={local.minPrice || ""}
                onChangeText={(v) => setLocal((p) => ({ ...p, minPrice: v }))}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
              <Text style={{ color: theme.subtext }}>—</Text>
              <TextInput
                placeholder="Max"
                placeholderTextColor={theme.subtext}
                keyboardType="numeric"
                value={local.maxPrice || ""}
                onChangeText={(v) => setLocal((p) => ({ ...p, maxPrice: v }))}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            <Text style={[styles.label, { color: theme.subtext }]}>Condition</Text>
            <View style={styles.chipRow}>
              {(["new", "used"] as ProductCondition[]).map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() =>
                    setLocal((p) => ({
                      ...p,
                      condition: p.condition === c ? null : c,
                    }))
                  }
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        local.condition === c ? "#4caf50" : theme.background,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: local.condition === c ? "#fff" : theme.text,
                      textTransform: "capitalize",
                    }}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.subtext }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {MARKET_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() =>
                      setLocal((p) => ({
                        ...p,
                        category: p.category === cat ? null : cat,
                      }))
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          local.category === cat
                            ? "#4caf50"
                            : theme.background,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: local.category === cat ? "#fff" : theme.text,
                        fontSize: 11,
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.label, { color: theme.subtext }]}>Location</Text>
            <TextInput
              placeholder="County or town"
              placeholderTextColor={theme.subtext}
              value={local.county || ""}
              onChangeText={(v) =>
                setLocal((p) => ({ ...p, county: v.trim() ? v : null }))
              }
              style={[
                styles.fullInput,
                { color: theme.text, borderColor: theme.border },
              ]}
            />

            <View style={styles.switchRow}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>
                Verified sellers only
              </Text>
              <Switch
                value={!!local.verifiedOnly}
                onValueChange={(v) =>
                  setLocal((p) => ({ ...p, verifiedOnly: v }))
                }
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => {
                onApply({
                  sort: "relevance",
                  category: null,
                  condition: null,
                  minPrice: "",
                  maxPrice: "",
                  county: null,
                  verifiedOnly: false,
                });
                onClose();
              }}
              style={[styles.btnOutline, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.text }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onApply(local);
                onClose();
              }}
              style={[styles.btnPrimary, { backgroundColor: "#4caf50" }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
    marginBottom: 40,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  title: { fontSize: 19, fontWeight: "800", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", marginTop: 12, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fullInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  btnOutline: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  btnPrimary: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
});
