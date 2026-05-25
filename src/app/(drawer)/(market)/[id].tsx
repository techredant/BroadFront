import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
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
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
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
import { MediaViewerModal } from "@/components/posts/MediaViewModal";
import { LikeBubbles } from "@/components/posts/LikeBubbles";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import Video from "react-native-video";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProductCard } from "@/components/market/ProductCard";
import { BoostListingModal } from "@/components/market/BoostListingModal";
import {
  fetchProduct,
  fetchRelated,
  toggleFavorite,
  reportProduct,
  submitReview,
  trackChatStarted,
} from "@/services/marketplaceApi";
import type { MarketplaceProduct } from "@/types/marketplace";

const { width } = Dimensions.get("window");

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const { user } = useUser();

  const [product, setProduct] = useState<
    (MarketplaceProduct & { phoneNumber?: string }) | null
  >(null);
  const [related, setRelated] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [favoriteBurstKey, setFavoriteBurstKey] = useState(0);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { client } = useChatContext();
  const { setChannel } = useAppContext();

  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [boostVisible, setBoostVisible] = useState(false);

  const productTheme = {
    card: theme.card,
    text: theme.text,
    success: theme.success ?? "#28a745",
    badge: theme.badge ?? "#e8e8e8",
    primary: theme.primary,
    subtext: theme.subtext,
  };

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchProduct(id);
      setProduct(data);
      const rel = await fetchRelated(id);
      setRelated(rel);
    } catch {
      Alert.alert("Error", "Product not found");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const owner = product?.userId === user?.id;
  const sortedMedia = [...(product?.media || [])];

  const boostRemaining = product?.boostExpiresAt
    ? Math.max(
        0,
        new Date(product.boostExpiresAt).getTime() - Date.now(),
      )
    : 0;
  const boostDaysLeft = Math.ceil(boostRemaining / (1000 * 60 * 60 * 24));

  const confirmDeleteProduct = async () => {
    setLoadingDelete(true);
    try {
      const { default: axios } = await import("axios");
      const { API_PUBLIC_URL } = await import("@/constants/api");
      await axios.delete(`${API_PUBLIC_URL}/api/products/${product?._id}`, {
        data: { userId: user?.id },
      });
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

  const startDM = async () => {
    if (!client?.userID || !product?.userId) return;
    try {
      const channel = client.channel("messaging", {
        members: [client.userID, product.userId],
        distinct: true,
      });
      await channel.watch();
      setChannel(channel);
      await channel.sendMessage({
        text: "",
        productId: product._id,
        product: {
          id: product._id,
          title: product.title,
          price: product.price,
          image: product.media?.[0],
          category: product.category,
        },
        attachments: [
          {
            type: "image",
            image_url: product.media?.[0],
            productId: product._id,
            title: product.title,
            price: product.price,
          },
        ],
      });
      await trackChatStarted(product._id);
      router.push(`/channel/${channel.cid}`);
    } catch {
      Alert.alert("Chat error", "Could not start conversation");
    }
  };

  const onFavorite = async () => {
    if (!user?.id || !product) return;
    try {
      const res = await toggleFavorite(product._id, user.id);
      if (res.favorited) setFavoriteBurstKey((key) => key + 1);
      setFavorited(res.favorited);
    } catch {
      Alert.alert("Error", "Could not update favorites");
    }
  };

  const shareProduct = async () => {
    if (!product) return;
    await Share.share({
      message: `${product.title} — KES ${product.price.toLocaleString("en-KE")}\n${product.description || ""}`,
    });
  };

  const onReport = () => {
    Alert.alert("Report listing", "Why are you reporting?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Scam",
        onPress: () => submitReport("scam"),
      },
      {
        text: "Fake product",
        onPress: () => submitReport("fake_product"),
      },
      {
        text: "Other",
        onPress: () => submitReport("other"),
      },
    ]);
  };

  const submitReport = async (reason: string) => {
    if (!user?.id || !product) return;
    try {
      await reportProduct({
        productId: product._id,
        reporterId: user.id,
        reason,
      });
      Alert.alert("Reported", "Thanks — we will review this listing.");
    } catch {
      Alert.alert("Error", "Could not submit report");
    }
  };

  const postReview = async () => {
    if (!user?.id || !product) return;
    try {
      await submitReview({
        productId: product._id,
        reviewerId: user.id,
        rating,
        comment: reviewComment,
      });
      setReviewVisible(false);
      Alert.alert("Thank you", "Your review was submitted.");
      loadProduct();
    } catch {
      Alert.alert("Error", "Could not submit review");
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.center, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!product) return null;

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

      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.fab}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.fabRow}>
          <TouchableOpacity
            onPress={onFavorite}
            style={[styles.fab, styles.fabBubbleHost]}
          >
            <LikeBubbles burstKey={favoriteBurstKey} color="#FF3B30" />
            <Ionicons
              name={favorited ? "heart" : "heart-outline"}
              size={22}
              color={favorited ? "#FF3B30" : "#fff"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareProduct} style={styles.fab}>
            <Ionicons name="share-social-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <Menu>
            <MenuTrigger>
              <View style={styles.fab}>
                <Feather name="more-vertical" size={20} color="#fff" />
              </View>
            </MenuTrigger>
            <MenuOptions
              customStyles={{
                optionsContainer: {
                  borderRadius: 12,
                  backgroundColor: theme.card,
                  width: 200,
                },
              }}
            >
              {owner ? (
                <>
                  <MenuOption onSelect={() => setEditVisible(true)}>
                    <Text style={{ color: theme.text, padding: 10 }}>Edit</Text>
                  </MenuOption>
                  <MenuOption onSelect={() => setDeleteVisible(true)}>
                    <Text style={{ color: "red", padding: 10 }}>Delete</Text>
                  </MenuOption>
                </>
              ) : (
                <>
                  <MenuOption onSelect={onReport}>
                    <Text style={{ color: "red", padding: 10 }}>Report</Text>
                  </MenuOption>
                  <MenuOption onSelect={() => setReviewVisible(true)}>
                    <Text style={{ color: theme.text, padding: 10 }}>
                      Leave review
                    </Text>
                  </MenuOption>
                </>
              )}
            </MenuOptions>
          </Menu>
        </View>
      </View>

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
            <Pressable key={idx} onPress={() => { setSelectedIndex(idx); setModalVisible(true); }}>
              {isVideo ? (
                <Video
                  source={{ uri }}
                  style={{ width, height: 380 }}
                  resizeMode="cover"
                  repeat
                  muted
                />
              ) : (
                <Image
                  source={{ uri }}
                  style={{ width, height: 380 }}
                  contentFit="cover"
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.dots}>
        {sortedMedia.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                width: activeIndex === idx ? 20 : 8,
                backgroundColor:
                  activeIndex === idx ? theme.primary : theme.border,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {product.fraudWarning && (
          <View style={styles.fraudBanner}>
            <Ionicons name="warning" size={18} color="#B45309" />
            <Text style={styles.fraudText}>{product.fraudWarning}</Text>
          </View>
        )}

        {(product.isPromoted && boostDaysLeft > 0) || owner ? (
          <View
            style={[
              styles.boostBanner,
              owner &&
                !product.isPromoted && {
                  backgroundColor: "#FF6B0015",
                  padding: 12,
                  borderRadius: 12,
                },
            ]}
          >
            <Ionicons name="flash" size={16} color="#FF6B00" />
            {product.isPromoted && boostDaysLeft > 0 ? (
              <Text
                style={{
                  color: "#FF6B00",
                  fontWeight: "600",
                  marginLeft: 6,
                  flex: 1,
                }}
              >
                Promoted · {boostDaysLeft} day{boostDaysLeft === 1 ? "" : "s"} left
              </Text>
            ) : owner ? (
              <Text
                style={{
                  color: theme.subtext,
                  marginLeft: 6,
                  flex: 1,
                  fontSize: 12,
                }}
              >
                Boost this listing to reach more buyers
              </Text>
            ) : null}
            {owner && (
              <TouchableOpacity
                onPress={() => setBoostVisible(true)}
                style={styles.boostCta}
              >
                <Text style={styles.boostCtaText}>
                  {product.isPromoted ? "Extend" : "Boost"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <Text style={[styles.price, { color: theme.success }]}>
          KES {product.price.toLocaleString("en-KE")}
        </Text>
        <Text style={[styles.title, { color: theme.text }]}>{product.title}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.primary }}>{product.category}</Text>
          </View>
          {product.condition && (
            <View style={[styles.chip, { backgroundColor: theme.card }]}>
              <Text style={{ color: theme.text, textTransform: "capitalize" }}>
                {product.condition}
              </Text>
            </View>
          )}
        </View>

        {product.seller && (
          <TouchableOpacity
            style={[styles.sellerCard, { backgroundColor: theme.card }]}
            onPress={() =>
              router.push(`/(drawer)/(profileId)/${product.seller!.clerkId}`)
            }
          >
            <Image
              source={{
                uri: product.seller.image || "https://via.placeholder.com/80",
              }}
              style={styles.sellerAvatar}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.sellerNameRow}>
                <Text style={[styles.sellerName, { color: theme.text }]}>
                  {product.seller.name}
                </Text>
                <VerifiedBadge
                  isVerified={product.seller.isVerified}
                  size={16}
                />
              </View>
              {product.seller.ratingCount > 0 && (
                <Text style={{ color: theme.subtext, fontSize: 12 }}>
                  ★ {product.seller.ratingAvg.toFixed(1)} (
                  {product.seller.ratingCount} reviews)
                </Text>
              )}
              {product.seller.county && (
                <Text style={{ color: theme.subtext, fontSize: 11 }}>
                  📍 {product.seller.county}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
          </TouchableOpacity>
        )}

        <View style={[styles.descCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.descTitle, { color: theme.text }]}>
            Description
          </Text>
          <Text style={{ color: theme.subtext, lineHeight: 22 }}>
            {product.description || "No description"}
          </Text>
        </View>

        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.descTitle, { color: theme.text }]}>
              Related products
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {related.map((item, i) => (
                <ProductCard
                  key={item._id}
                  item={item}
                  theme={productTheme}
                  compact
                  index={i}
                  onPress={() => router.push(`/${item._id}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {owner && (
        <View
          style={[
            styles.bottomBar,
            { borderTopColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <TouchableOpacity
            onPress={() => setEditVisible(true)}
            style={[styles.outlineBtn, { borderColor: theme.border }]}
          >
            <Feather name="edit-2" size={18} color={theme.text} />
            <Text style={{ color: theme.text, fontWeight: "600" }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setBoostVisible(true)}
            style={[styles.buyBtn, styles.boostBtnRow, { backgroundColor: "#FF6B00" }]}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", marginLeft: 6 }}>
              Boost listing
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!owner && (
        <View
          style={[styles.bottomBar, { borderTopColor: theme.border, backgroundColor: theme.background }]}
        >
          <TouchableOpacity
            onPress={() =>
              product.phoneNumber &&
              Linking.openURL(`tel:${product.phoneNumber}`)
            }
            style={[styles.outlineBtn, { borderColor: theme.primary }]}
          >
            <Ionicons name="call-outline" size={18} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: "700" }}>
              Contact
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={startDM} style={[styles.outlineBtn, { borderColor: theme.border }]}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.text} />
            <Text style={{ color: theme.text, fontWeight: "600" }}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={startDM}
            style={[styles.buyBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Buy now</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={deleteVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={{ fontWeight: "700", fontSize: 17, color: theme.text }}>
              Delete listing?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setDeleteVisible(false)}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteProduct}>
                <Text style={{ color: "red" }}>
                  {loadingDelete ? "..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={{ fontWeight: "700", fontSize: 17, color: theme.text }}>
              Rate seller
            </Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Ionicons
                    name={n <= rating ? "star" : "star-outline"}
                    size={32}
                    color="#F5A623"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Comment (optional)"
              placeholderTextColor={theme.subtext}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
            />
            <TouchableOpacity
              onPress={postReview}
              style={[styles.buyBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                Submit review
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReviewVisible(false)} style={{ marginTop: 12 }}>
              <Text style={{ textAlign: "center", color: theme.subtext }}>Cancel</Text>
            </TouchableOpacity>
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

      <BoostListingModal
        visible={boostVisible}
        onClose={() => setBoostVisible(false)}
        productId={product._id}
        productTitle={product.title}
        onSuccess={loadProduct}
        theme={{
          card: theme.card,
          text: theme.text,
          subtext: theme.subtext,
          border: theme.border,
          primary: theme.primary,
          background: theme.background,
        }}
      />

      <EditProduct
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        product={product}
        onSubmit={async (updatedData) => {
          const { default: axios } = await import("axios");
          const { API_PUBLIC_URL } = await import("@/constants/api");
          await axios.put(`${API_PUBLIC_URL}/api/products/${product._id}`, {
            ...updatedData,
            userId: user?.id,
          });
          loadProduct();
          setEditVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  floatingHeader: {
    position: "absolute",
    top: 50,
    zIndex: 99,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  fab: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 10,
    borderRadius: 999,
  },
  fabBubbleHost: {
    position: "relative",
    overflow: "visible",
  },
  fabRow: { flexDirection: "row", gap: 8 },
  dots: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  dot: { height: 8, borderRadius: 10, marginHorizontal: 4 },
  content: { padding: 18, paddingBottom: 100 },
  fraudBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  fraudText: { flex: 1, color: "#92400E", fontSize: 12 },
  boostBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  boostCta: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  boostCtaText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  price: { fontSize: 27, fontWeight: "800" },
  title: { fontSize: 19, fontWeight: "700", marginTop: 6 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
    gap: 12,
  },
  sellerAvatar: { width: 52, height: 52, borderRadius: 26 },
  sellerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sellerName: { fontSize: 15, fontWeight: "700" },
  descCard: { marginTop: 16, padding: 16, borderRadius: 16 },
  descTitle: { fontWeight: "700", marginBottom: 8, fontSize: 15 },
  relatedSection: { marginTop: 20 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  buyBtn: {
    flex: 1.2,
    padding: 14,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  boostBtnRow: { flexDirection: "row" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 20,
  },
  modalBox: { borderRadius: 20, padding: 24 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  stars: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 16 },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
});
