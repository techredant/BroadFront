import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import Video from "react-native-video";

type Product = {
  _id: string;
  title: string;
  price: number;
  media: string[];
  category: string;
  status?: "new" | "sold";
  verified?: boolean;
};

export default function MarketScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get<Product[]>(
        "https://cast-api-zeta.vercel.app/api/products",
      );

      const sorted = (res.data || [])
        .filter((p) => p && p._id && p.title)
        .sort((a, b) => b._id.localeCompare(a._id));

      setProducts(sorted);
    } catch (err) {
      console.error("❌ Product fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch = (item.title || "")
        .toLowerCase()
        .includes(searchText.toLowerCase());

      const matchesCategory = selectedCategory
        ? item.category === selectedCategory
        : true;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchText, selectedCategory]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="small" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <DrawerMenuButton />

      {/* HEADER */}
      <View style={styles.header}>
        <Text />

        <Text style={[styles.title, { color: theme.text }]}>Market</Text>

        <Pressable
          onPress={() => router.push("/sell-form")}
          style={[styles.sellBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={{ color: theme.buttonText, fontWeight: "600" }}>
            Sell
          </Text>
        </Pressable>
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.subtext} />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor={theme.subtext}
            value={searchText}
            onChangeText={setSearchText}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
      </View>

      {/* CATEGORIES (FIXED SPACING) */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
                color:
                  selectedCategory === null ? theme.buttonText : theme.text,
              }}
            >
              All
            </Text>
          </Pressable>

          {categories.map((cat) => {
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
                    color: selected ? theme.buttonText : theme.text,
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* PRODUCTS */}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContainer}
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        renderItem={({ item, index }) => {
          const mediaUrl =
            item.media?.[item.media.length - 1] ||
            "https://via.placeholder.com/300";

          const isVideo = /\.(mp4|mov|webm)$/i.test(mediaUrl);

          return (
            <Pressable
              onPress={() => router.push(`/${item._id}`)}
              style={[styles.card, { backgroundColor: theme.card }]}
            >
              <Animated.View entering={FadeInUp.delay(120)}>
                {isVideo ? (
                  <Video
                    source={{ uri: mediaUrl }}
                    style={styles.media}
                    resizeMode="cover"
                    muted
                    repeat
                  />
                ) : (
                  <Image
                    source={{ uri: mediaUrl }}
                    style={styles.media}
                    resizeMode="cover"
                  />
                )}
              </Animated.View>

              <View style={styles.cardBody}>
                <Text
                  numberOfLines={1}
                  style={[styles.productTitle, { color: theme.text }]}
                >
                  {item.title}
                </Text>

                <Text style={[styles.price, { color: theme.success }]}>
                  KES {(item.price || 0).toLocaleString("en-KE")}
                </Text>

                <View style={[styles.badge, { backgroundColor: theme.badge }]}>
                  <Text style={{ fontSize: 12, color: theme.text }}>
                    {item.category || "Other"}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
  },

  sellBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
  },

  categoryWrapper: {
    marginBottom: 8, // 🔥 FIXED spacing issue
  },

  categoryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: "center",
  },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },

  listContainer: {
    paddingBottom: 24,
    paddingHorizontal: 8,
  },

  row: {
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },

  card: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    marginHorizontal: 4,
  },

  media: {
    width: "100%",
    height: 160,
  },

  cardBody: {
    padding: 12,
  },

  productTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  price: {
    fontWeight: "700",
    marginTop: 4,
  },

  badge: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
});
