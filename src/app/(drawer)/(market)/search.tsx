import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { ProductCard } from "@/components/market/ProductCard";
import { FilterSheet } from "@/components/market/FilterSheet";
import { MarketSkeleton } from "@/components/market/MarketSkeleton";
import { useMarketplaceFeed } from "@/hooks/useMarketplaceFeed";
import type { ProductFilters } from "@/types/marketplace";

const cardTheme = (t: ReturnType<typeof useTheme>["theme"]) => ({
  card: t.card,
  text: t.text,
  success: t.success ?? "#28a745",
  badge: t.badge ?? "#e8e8e8",
  primary: t.primary,
  subtext: t.subtext,
});

function parseFiltersFromParams(
  params: Record<string, string | string[] | undefined>,
): ProductFilters {
  const str = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : undefined;
  };
  return {
    q: str("q"),
    category: str("category") || null,
    condition: (str("condition") as ProductFilters["condition"]) || null,
    minPrice: str("minPrice"),
    maxPrice: str("maxPrice"),
    county: str("county") || null,
    verifiedOnly: str("verifiedOnly") === "true",
    sort: (str("sort") as ProductFilters["sort"]) || "relevance",
  };
}

export default function MarketSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    sort?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    verifiedOnly?: string;
  }>();
  const { theme } = useTheme();
  const productTheme = cardTheme(theme);

  const initialFilters = useMemo(() => parseFiltersFromParams(params), []);
  const [query, setQuery] = useState(params.q?.toString() || "");
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [submitted, setSubmitted] = useState(!!params.q);

  const activeFilters: ProductFilters = {
    ...filters,
    q: submitted ? query.trim() || undefined : undefined,
  };

  const {
    products,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    initialLoad,
  } = useMarketplaceFeed(activeFilters);

  useEffect(() => {
    if (submitted) {
      initialLoad();
    }
  }, [submitted, query, JSON.stringify(filters)]);

  const onSearch = useCallback(() => {
    setSubmitted(true);
    initialLoad();
  }, [query, filters]);

  const resultLabel = submitted
    ? `${products.length}${hasMore ? "+" : ""} results`
    : "Type to search listings";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.subtext} />
          <TextInput
            autoFocus={!params.q}
            placeholder="Search marketplace..."
            placeholderTextColor={theme.subtext}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            style={[styles.searchInput, { color: theme.text }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.subtext} />
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => setFilterOpen(true)} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={{ color: theme.subtext, fontSize: 12 }}>{resultLabel}</Text>
        {submitted && (
          <Pressable onPress={onSearch}>
            <Text style={{ color: theme.primary, fontWeight: "600" }}>
              Search
            </Text>
          </Pressable>
        )}
      </View>

      {!submitted ? (
        <View style={styles.emptyHint}>
          <Ionicons name="search-outline" size={48} color={theme.subtext} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Find anything
          </Text>
          <Text style={{ color: theme.subtext, textAlign: "center", marginTop: 8 }}>
            Search by product name, then refine with filters.
          </Text>
        </View>
      ) : loading && products.length === 0 ? (
        <MarketSkeleton />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.primary}
            />
          }
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Text style={[styles.emptyList, { color: theme.subtext }]}>
              No listings match your search. Try different keywords or filters.
            </Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item, index }) => (
            <ProductCard
              item={item}
              theme={productTheme}
              index={index}
              onPress={() => router.push(`/${item._id}`)}
            />
          )}
        />
      )}

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(f) => {
          setFilters(f);
          setSubmitted(true);
        }}
        theme={theme as Record<string, string>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: { padding: 4 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8 },
  filterBtn: { padding: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 8, paddingBottom: 24 },
  row: { justifyContent: "space-between", paddingHorizontal: 8 },
  emptyHint: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 12 },
  emptyList: { textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
});
