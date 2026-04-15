import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";

type Product = {
  _id: string;
  title: string;
  price: number;
  images: string[];
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

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get<Product[]>(
          "https://cast-api-zeta.vercel.app/api/products",
        );
        setProducts(res.data);
      } catch (err) {
        console.error("❌ Product fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Derive categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch = item.title
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
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        {/* <LoaderKitView
          style={{ width: 50, height: 50 }}
          name={"BallScaleRippleMultiple"}
          animationSpeedMultiplier={1.0} 
          color={theme.text} 
        /> */}

        <ActivityIndicator size={"small"} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <DrawerMenuButton />
    
          {/* TOP ROW */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              marginTop: 10,
              marginBottom: 12,
            }}
          >
            <Text></Text>
            {/* Title */}
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 22,
                color: theme.text,
                textAlign: "center",
    
              }}
            >
              Market
            </Text>
    
            {/* Sell Button */}
            <Pressable
              onPress={() => router.push("/sell-form")}
              style={{
                backgroundColor: theme.button,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.buttonText,
                  fontWeight: "600",
                }}
              >
                Sell
              </Text>
            </Pressable>
          </View>
    
          {/* SEARCH BAR */}
          <View
            style={{
              paddingHorizontal: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.card,
                borderRadius: 30,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons
                name="search"
                size={18}
                color={theme.subtext}
                style={{ marginRight: 8 }}
              />
    
              <TextInput
                placeholder="Search products..."
                placeholderTextColor={theme.subtext}
                value={searchText}
                onChangeText={setSearchText}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  color: theme.text,
                }}
              />
            </View>
          </View>

      {/* CATEGORY SCROLL */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 8,
          alignItems: "center",
          height: 50,
        }}
        style={{ marginBottom: 16 }}
      >
        {/* All Categories */}
        <Pressable
          onPress={() => setSelectedCategory(null)}
          style={{
            paddingHorizontal: 16,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            height: 40,
            marginRight: 8,
            backgroundColor:
              selectedCategory === null ? theme.primary : theme.card,
          }}
        >
          <Text
            style={{
              color: selectedCategory === null ? theme.buttonText : theme.text,
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
              style={{
                paddingHorizontal: 16,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                height: 40,
                marginRight: 8,
                backgroundColor: selected ? theme.primary : theme.card,
              }}
            >
              <Text style={{ color: selected ? theme.buttonText : theme.text }}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* PRODUCTS GRID */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "flex-start",
          paddingHorizontal: 12,
        }}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push(`/(market)/${item._id}`)}
            style={{
              flex: 1,
              marginBottom: 16,
              marginRight: index % 2 === 0 ? 8 : 0, // spacing only for left column
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: theme.card,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {/* IMAGE */}
            <Animated.View
              entering={FadeInUp.delay(200).duration(300)}
              style={{ position: "relative" }}
            >
              <Image
                source={{ uri: item.images[0] }}
                style={{ width: "100%", height: 160 }}
                resizeMode="cover"
              />
              {/* BADGES */}
              {item.status && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: theme.danger,
                  }}
                >
                  <Text
                    style={{
                      color: theme.buttonText,
                      fontSize: 10,
                      fontWeight: "600",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              )}
              {item.verified && (
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: theme.info,
                  }}
                >
                  <Text
                    style={{
                      color: theme.buttonText,
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    Verified
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* CARD CONTENT */}
            <View style={{ padding: 12 }}>
              <Text
                style={{ color: theme.text, fontWeight: "600", fontSize: 16 }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  color: theme.success,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                KES {item.price.toLocaleString("en-KE")}
              </Text>
              <View
                style={{
                  marginTop: 4,
                  alignSelf: "flex-start",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 12,
                  backgroundColor: theme.badge,
                }}
              >
                <Text style={{ fontSize: 12, color: theme.text }}>
                  {item.category}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ color: theme.text }}>No products found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
