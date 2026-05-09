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
  Modal,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import axios from "axios";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useChatContext } from "stream-chat-expo";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useAppContext } from "@/contexts/AppProvider";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import EditProduct from "./editProduct";
import { MediaViewerModal } from "@/app/components/posts/MediaViewModal";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import Video from "react-native-video";

const { width } = Dimensions.get("window");

type Product = {
  _id: string;
  title: string;
  price: number;
  media: string[];
  category: string;
  description?: string;
  userId: string;
  phoneNumber: string;
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const { user } = useUser();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const { client } = useChatContext();
  const { setChannel } = useAppContext();

  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const openMedia = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  useEffect(() => {
    if (!id) return;

    axios
      .get(`https://cast-api-zeta.vercel.app/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  const confirmDeleteProduct = async () => {
    setLoadingDelete(true);

    try {
      await axios.delete(
        `https://cast-api-zeta.vercel.app/api/products/${product?._id}`,
        { data: { userId: user?.id } },
      );

      router.back();
    } finally {
      setLoadingDelete(false);
      setDeleteVisible(false);
    }
  };

  const pinchScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.value = e.scale;
    })
    .onEnd(() => {
      pinchScale.value = withSpring(1);
    });

  const pinchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinchScale.value }],
  }));

  const callSeller = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

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
        text: `${product.title}\nPrice: KES ${product.price.toLocaleString("en-KE")}\nView product: https://cast-api-zeta.vercel.app/product/${product._id}`,
        attachments: [
          {
            type: "image",
            image_url: product?.media?.[0],
          },
        ],
      });

      router.push(`/channel/${channel.cid}`);
    } catch (err) {
      console.error("❌ Failed to start chat:", err);
    }
  };

  const shareProduct = async () => {
    if (!product) return;

    try {
      await Share.share({
        message: `${product.title} for KES ${product.price.toLocaleString("en-KE")}\n${product.description || ""}\nView it here: https://cast-api-zeta.vercel.app/product/${product._id}`,
      });
    } catch (error) {
      console.error("Share failed", error);
    }
  };

  const reportProduct = () => {
    Alert.alert(
      "Report Product",
      "Are you sure you want to report this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => {
            console.log("Product reported", product?._id);
            Alert.alert("Reported", "Thanks — we will review this listing.");
          },
        },
      ],
    );
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

  if (!product) return null;

  const owner = product.userId === user?.id;

  const sortedMedia = [...(product?.media || [])].reverse();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["bottom"]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {/* Floating Header */}
      <View
        style={{
          position: "absolute",
          top: 50,
          zIndex: 99,
          width: "100%",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(0,0,0,0.35)",
            padding: 10,
            borderRadius: 999,
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Menu>
          <MenuTrigger>
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.35)",
                padding: 10,
                borderRadius: 999,
              }}
            >
              <Feather name="more-vertical" size={20} color="#fff" />
            </View>
          </MenuTrigger>

          <MenuOptions
            customStyles={{
              optionsContainer: {
                borderRadius: 12,
                paddingVertical: 6,
                width: 180,
                backgroundColor: theme.card, // ✅ THIS is what matters

                borderColor: theme.border || "#00000020",
              },
            }}
          >
            {owner ? (
              <>
                <MenuOption
                  onSelect={() => setEditVisible(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    padding: 10,
                  }}
                >
                  <Feather name="edit-2" size={16} color={theme.text} />
                  <Text style={{ color: theme.text }}>Edit Product</Text>
                </MenuOption>
                <MenuOption
                  onSelect={() => setDeleteVisible(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    padding: 10,
                  }}
                >
                  <Ionicons name="trash" color="red" size={20} />
                  <Text style={{ color: "red" }}>Delete</Text>
                </MenuOption>
              </>
            ) : (
              <>
                <MenuOption
                  onSelect={startDM}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    padding: 10,
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color={theme.text}
                  />
                  <Text style={{ color: theme.text }}>Chat Seller</Text>
                </MenuOption>
                <MenuOption
                  onSelect={() => callSeller(product.phoneNumber)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    padding: 10,
                  }}
                >
                  <Ionicons name="call-outline" size={18} color={theme.text} />
                  <Text style={{ color: theme.text }}>Call Seller</Text>
                </MenuOption>
                <MenuOption
                  onSelect={shareProduct}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    padding: 10,
                  }}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={18}
                    color={theme.text}
                  />
                  <Text style={{ color: theme.text }}>Share Product</Text>
                </MenuOption>
                <MenuOption
                  onSelect={reportProduct}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    padding: 10,
                  }}
                >
                  <Ionicons name="flag-outline" size={18} color="red" />
                  <Text style={{ color: "red" }}>Report Product</Text>
                </MenuOption>
              </>
            )}
          </MenuOptions>
        </Menu>
      </View>

      {/* Media Carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) =>
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {sortedMedia.map((uri, idx) => {
          const isVideo = /\.(mp4|mov|webm)$/i.test(uri);

          return (
            <Pressable key={idx} onPress={() => openMedia(idx)}>
              {isVideo ? (
                <>
                  <Video
                    source={{ uri }}
                    style={{ width, height: 360 }}
                    resizeMode="cover"
                    repeat
                    muted
                  />
                  <TouchableOpacity
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: "rgba(0,0,0,0.0)",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                    onPress={() => openMedia(idx)}
                  ></TouchableOpacity>
                </>
              ) : (
                <Image
                  source={{ uri }}
                  style={{ width, height: 360 }}
                  resizeMode="cover"
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 10,
        }}
      >
        {product.media.map((_, idx) => (
          <View
            key={idx}
            style={{
              width: activeIndex === idx ? 20 : 8,
              height: 8,
              borderRadius: 10,
              marginHorizontal: 4,
              backgroundColor:
                activeIndex === idx ? theme.primary : theme.border,
            }}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView style={{ padding: 18 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: theme.success,
          }}
        >
          KES {product.price.toLocaleString()}
        </Text>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            marginTop: 8,
            color: theme.text,
          }}
        >
          {product.title}
        </Text>

        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: theme.card,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            marginTop: 10,
          }}
        >
          <Text style={{ color: theme.primary }}>{product.category}</Text>
        </View>

        <View
          style={{
            marginTop: 20,
            padding: 18,
            backgroundColor: theme.card,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              marginBottom: 8,
              color: theme.text,
            }}
          >
            Description
          </Text>
          <Text style={{ color: theme.subtext, lineHeight: 24 }}>
            {product.description || "No description available"}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {!owner && (
        <View
          style={{
            flexDirection: "row",
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <TouchableOpacity
            onPress={() => callSeller(product.phoneNumber)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.primary,
              padding: 14,
              borderRadius: 18,
              alignItems: "center",
              marginRight: 8,
            }}
          >
            <Text style={{ color: theme.primary, fontWeight: "700" }}>
              Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={startDM}
            style={{
              flex: 1,
              backgroundColor: theme.primary,
              padding: 14,
              borderRadius: 18,
              alignItems: "center",
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Chat Seller
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Modal */}
      <Modal visible={deleteVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 24,
              padding: 24,
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 18 }}>
              Delete Product?
            </Text>

            <Text style={{ marginTop: 8, color: theme.subtext }}>
              This action cannot be undone.
            </Text>

            <View
              style={{
                flexDirection: "row",
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setDeleteVisible(false)}
                style={{ flex: 1 }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmDeleteProduct}
                style={{ flex: 1 }}
              >
                <Text style={{ color: "red", textAlign: "right" }}>
                  {loadingDelete ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MediaViewerModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mediaList={product.media}
        selectedIndex={selectedIndex}
        post={product}
        pinchGesture={pinchGesture}
        pinchStyle={pinchStyle}
      />

      <EditProduct
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        product={product}
        onSubmit={async (updatedData: any) => {
          try {
            await axios.put(
              `https://cast-api-zeta.vercel.app/api/products/${product._id}`,
              updatedData,
            );

            // optional: refresh UI or state here
            console.log("Product updated");
          } catch (err) {
            console.log("Update failed", err);
          }
        }}
      />
    </SafeAreaView>
  );
}
