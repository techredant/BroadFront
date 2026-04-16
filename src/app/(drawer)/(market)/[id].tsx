import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Link } from "expo-router";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useChatContext } from "stream-chat-expo";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useAppContext } from "@/contexts/AppProvider";

const { width } = Dimensions.get("window");

type Product = {
  _id: string;
  title: string;
  price: number;
  images: string[];
  category: string;
  description?: string;
  userId: string;
  phoneNumber: number;
};

interface Member {
  _id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  nickName: string;
  image: string;
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { client } = useChatContext();
  const { setChannel } = useAppContext(); // you MUST have this

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const res = await axios.get(
          `https://cast-api-zeta.vercel.app/api/products/${id}`,
        );
        setProduct(res.data);
      } catch (err) {
        console.error("Product fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const callSeller = (phoneNumber: string) => {
    if (!phoneNumber) {
      alert("No phone number available");
      return;
    }

    const url = `tel:${phoneNumber}`;

    Linking.openURL(url).catch(() => {
      alert("Unable to make a call");
    });
  };

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
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.text }}>Product not found</Text>
      </SafeAreaView>
    );
  }

  const owner = product.userId === user?.id;

  const startDM = async () => {
    if (!client || !client.userID || !product?.userId) return;

    try {
      const currentUserId = client.userID;

      const channel = client.channel("messaging", {
        members: [currentUserId, product.userId],
        distinct: true,
      });

      await channel.watch();

      setChannel(channel); // 🔥 THIS IS WHAT YOU'RE MISSING

      await channel.sendMessage({
        text: `${product.title}\nPrice: KES ${product.price.toLocaleString("en-KE")}`,
        attachments: [
          {
            type: "image",
            image_url: product.images?.[0],
          },
        ],
      });

      router.push(`/channel/${channel.cid}`);
    } catch (err) {
      console.error("❌ Failed to start chat:", err);
    }
  };
  // const { handleStartChat } = useStartChat({
  //   client,
  //   userId,
  //   setChannel,
  //   setCreating,
  // });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={{ position: "absolute", left: 16 }}
        >
          <Ionicons name="arrow-back" size={28} color={theme.subtext} />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: theme.text,
          }}
          numberOfLines={1}
        >
          {product.title}
        </Text>
      </View>

      {/* IMAGE CAROUSEL */}
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) =>
            setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          scrollEventThrottle={16}
        >
          {product.images.map((img, idx) => (
            <Image
              key={idx}
              source={{ uri: img }}
              style={{ width, height: 340 }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 72 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* PRICE */}
          <Text
            style={{ fontSize: 24, fontWeight: "800", color: theme.success }}
          >
            KES {product.price.toLocaleString("en-KE")}
          </Text>
          {/* IMAGE COUNT */}
          {product.images.length > 1 && (
            <Text
              style={{
                color: theme.subtext,
                fontSize: 20,
                marginLeft: "auto",
                fontWeight: "bold",
              }}
            >
              {activeIndex + 1}/{product.images.length}
            </Text>
          )}
        </View>

        {/* CATEGORY */}
        <View
          style={{
            alignSelf: "flex-start",
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: theme.card,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.subtext }}>
            {product.category}
          </Text>
        </View>

        {/* DESCRIPTION */}
        {product.description && (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 4,
              }}
            >
              Description
            </Text>
            <Text
              style={{ fontSize: 14, color: theme.subtext, lineHeight: 22 }}
            >
              {product.description}
            </Text>
          </View>
        )}

        {/* SELLER CARD */}
        <View
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 16,
            backgroundColor: theme.card,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.text }}>
            Seller Information
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                backgroundColor: theme.success,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
                S
              </Text>
            </View>

            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontWeight: "600", color: theme.text }}>
                Verified Seller
              </Text>
              <Text style={{ fontSize: 12, color: theme.subtext }}>
                Active on platform
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View
        style={{
          // position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background,
          paddingHorizontal: 16,
          paddingVertical: 5,
        }}
      >
        {!owner && (
          <>
            {/* CALL BUTTON */}
            <TouchableOpacity
              onPress={() => callSeller(product?.phoneNumber)} // 👈 pass seller number
              style={{
                flex: 1,
                marginRight: 8,
                borderWidth: 1,
                borderColor: theme.success,
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row", // ✅ align icon + text horizontally
                justifyContent: "center",
                gap: 6, // ✅ spacing (RN >= 0.71)
              }}
            >
              <Ionicons name="call-outline" size={18} color={theme.success} />
              <Text style={{ color: theme.success, fontWeight: "600" }}>
                Call Seller
              </Text>
            </TouchableOpacity>

            {/* CHAT BUTTON */}
            <Pressable
              onPress={startDM}
              style={{
                flex: 1,
                marginLeft: 8,
                backgroundColor: theme.success,
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row", // ✅ horizontal
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Chat with seller
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
