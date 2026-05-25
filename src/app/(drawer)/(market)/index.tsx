import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";
import { ProductCard } from "@/components/market/ProductCard";
import { MarketSkeleton } from "@/components/market/MarketSkeleton";
import { FilterSheet } from "@/components/market/FilterSheet";
import { useMarketplaceFeed } from "@/hooks/useMarketplaceFeed";
import {
  fetchPromoted,
  fetchTrending,
  MARKET_CATEGORIES,
} from "@/services/marketplaceApi";
import type { MarketplaceProduct, ProductFilters } from "@/types/marketplace";

const cardTheme = (t: ReturnType<typeof useTheme>["theme"]) => ({
  card: t.card,
  text: t.text,
  success: t.success ?? "#28a745",
  badge: t.badge ?? "#e8e8e8",
  primary: t.primary,
  subtext: t.subtext,
});

export default function MarketScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const productTheme = cardTheme(theme);

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({ sort: "relevance" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [promoted, setPromoted] = useState<MarketplaceProduct[]>([]);
  const [trending, setTrending] = useState<MarketplaceProduct[]>([]);

  const goToSearch = (q?: string) => {
    const href = q?.trim()
      ? `/search?q=${encodeURIComponent(q.trim())}`
      : "/search";
    router.push(href as Href);
  };

  const activeFilters: ProductFilters = {
    ...filters,
    q: searchText.trim() || undefined,
    category: selectedCategory,
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

  const loadHighlights = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([fetchPromoted(), fetchTrending()]);
      setPromoted(p);
      setTrending(t);
    } catch {
      /* optional sections */
    }
  }, []);

  const openProduct = useCallback(
    (productId: string) => {
      router.push({
        pathname: "/(drawer)/(market)/[id]",
        params: { id: productId },
      } as Href);
    },
    [router],
  );

  useFocusEffect(
    useCallback(() => {
      initialLoad();
      loadHighlights();
    }, [JSON.stringify(activeFilters)]),
  );

  useEffect(() => {
    const t = setTimeout(() => {
      initialLoad();
    }, 400);
    return () => clearTimeout(t);
  }, [searchText, selectedCategory, JSON.stringify(filters)]);

  const renderHeader = () => (
    <View>
      {promoted.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={18} color="#FF6B00" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Promoted
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {promoted.map((item, i) => (
              <ProductCard
                key={item._id}
                item={item}
                theme={productTheme}
                compact
                index={i}
                onPress={() => openProduct(item._id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {trending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Trending
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trending.map((item, i) => (
              <ProductCard
                key={`t-${item._id}`}
                item={item}
                theme={productTheme}
                compact
                index={i}
                onPress={() => openProduct(item._id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={[styles.feedTitle, { color: theme.text }]}>
        All listings
      </Text>
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <DrawerMenuButton />
        <MarketSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <DrawerMenuButton />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, textAlign: "center" }]}>Marketplace</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/(drawer)/(market)/seller-dashboard" as Href)}
            style={[styles.iconBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons name="stats-chart" size={18} color={theme.primary} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(drawer)/(market)/live" as Href)}
            style={[styles.iconBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons name="radio" size={18} color="#FE2C55" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(drawer)/(market)/sell-form" as Href)}
            style={[styles.sellBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={{ color: theme.buttonText, fontWeight: "700" }}>
              Sell
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.subtext} />
          <TextInput
            placeholder="Search phones, fashion, cars..."
            placeholderTextColor={theme.subtext}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => goToSearch(searchText)}
            onSubmitEditing={() => goToSearch(searchText)}
            returnKeyType="search"
            style={[styles.searchInput, { color: theme.text }]}
          />
          <Pressable onPress={() => setFilterOpen(true)} hitSlop={8}>
            <Ionicons
              name="options-outline"
              size={22}
              color={theme.primary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <Pressable
          onPress={() => setSelectedCategory(null)}
          style={[
            styles.categoryChip,
            {
              backgroundColor:
                selectedCategory === null ? theme.primary : theme.card,
            },
          ]}
        >
          <Text
            style={{
              color: selectedCategory === null ? "#fff" : theme.text,
              fontWeight: "600",
            }}
          >
            All
          </Text>
        </Pressable>
        {MARKET_CATEGORIES.map((cat) => {
          const selected = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(selected ? null : cat)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selected ? theme.primary : theme.card,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? "#fff" : theme.text,
                  fontSize: 12,
                }}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh();
              loadHighlights();
            }}
            tintColor={theme.primary}
          />
        }
        onEndReached={() => loadMore()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : !hasMore && products.length > 0 ? (
            <Text
              style={{
                textAlign: "center",
                color: theme.subtext,
                marginVertical: 16,
              }}
            >
              You&apos;ve seen it all
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Text
            style={{
              textAlign: "center",
              color: theme.subtext,
              marginTop: 40,
            }}
          >
            No products found. Try adjusting filters.
          </Text>
        }
        renderItem={({ item, index }) => (
          <ProductCard
            item={item}
            theme={productTheme}
            index={index}
            onPress={() => openProduct(item._id)}
          />
        )}
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
        theme={theme as Record<string, string>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  title: { fontSize: 23, fontWeight: "800", textAlign: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 10, borderRadius: 12 },
  sellBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  searchWrapper: { paddingHorizontal: 16, marginBottom: 10 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8 },
  categoryScroll: { maxHeight: 48, marginBottom: 8 },
  categoryContainer: { paddingHorizontal: 12, alignItems: "center" },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  section: { marginBottom: 16, paddingLeft: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  feedTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  listContainer: { paddingBottom: 24, paddingHorizontal: 8 },
  row: { justifyContent: "space-between", paddingHorizontal: 8 },
});
