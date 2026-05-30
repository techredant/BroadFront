import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  Dimensions,
  PixelRatio,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CachedImage, MediaSkeleton } from "@/components/media/CachedImage";
import type { SponsoredAd } from "@/types/ads";
import {
  engageAd,
  hideAd,
  reportAd,
  trackAdClick,
  trackAdImpression,
} from "@/services/adsApi";
import { useLevel } from "@/context/LevelContext";
import { resolveMediaUrl } from "@/utils/mediaUtils";
import { LikeBubbles } from "@/components/posts/LikeBubbles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AD_MEDIA_PIXEL_WIDTH = Math.round((SCREEN_WIDTH - 24) * PixelRatio.get());
const AD_LOGO_PIXEL_WIDTH = Math.round(44 * PixelRatio.get());

type Props = {
  ad: SponsoredAd;
  isVisible?: boolean;
  onHidden?: (adId: string) => void;
};

export function SponsoredAdCard({ ad, isVisible, onHidden }: Props) {
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const { currentLevel } = useLevel();
  const impressionSent = useRef(false);
  const [liked, setLiked] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isVisible || impressionSent.current) return;
    impressionSent.current = true;
    trackAdImpression(ad._id, {
      viewerClerkId: user?.id,
      levelType: currentLevel?.type,
      levelValue: currentLevel?.value,
      sessionId: user?.id,
    }).catch(() => {});
  }, [isVisible, ad._id, user?.id, currentLevel]);

  const handleCta = useCallback(async () => {
    try {
      const res = await trackAdClick(ad._id, {
        viewerClerkId: user?.id,
        clickType: "cta",
      });
      const url = res?.ctaUrl || ad.ctaUrl;
      if (url) {
        if (ad.productId) {
          router.push(`/(drawer)/(market)/${ad.productId}`);
        } else {
          await Linking.openURL(url);
        }
      } else {
        router.push(`/(drawer)/ads/${ad._id}`);
      }
    } catch {
      router.push(`/(drawer)/ads/${ad._id}`);
    }
  }, [ad, user?.id]);

  const handleLike = async () => {
    setLiked((v) => {
      if (!v) setLikeBurstKey((key) => key + 1);
      return !v;
    });
    await engageAd(ad._id, "like", user?.id).catch(() => {});
  };

  const handleSave = async () => {
    setSaved((v) => !v);
    await engageAd(ad._id, "save", user?.id).catch(() => {});
  };

  const handleShare = async () => {
    await engageAd(ad._id, "share", user?.id).catch(() => {});
    Alert.alert("Shared", "Thanks for sharing this promotion.");
  };

  const handleHide = async () => {
    if (!user?.id) return;
    await hideAd(ad._id, user.id);
    onHidden?.(ad._id);
    setMenuOpen(false);
  };

  const handleReport = () => {
    Alert.alert("Report ad", "Why are you reporting this ad?", [
      { text: "Scam", onPress: () => submitReport("scam") },
      { text: "Misleading", onPress: () => submitReport("misleading") },
      { text: "Spam", onPress: () => submitReport("spam") },
      { text: "Cancel", style: "cancel" },
    ]);
    setMenuOpen(false);
  };

  const submitReport = async (reason: string) => {
    if (!user?.id) return;
    await reportAd(ad._id, { reporterClerkId: user.id, reason });
    Alert.alert("Reported", "Thank you. Our team will review this ad.");
    onHidden?.(ad._id);
  };

  const media = ad.media || [];
  const isCarousel = ad.mediaType === "carousel" && media.length > 1;
  const mainMedia = media[carouselIndex] || media[0];
  const isMainMediaVideo = ad.mediaType === "video" || mainMedia?.type === "video";
  const rawMainMedia = isMainMediaVideo
    ? mainMedia?.thumbnailUrl
    : mainMedia?.thumbnailUrl || mainMedia?.url;
  const mainMediaUri = useMemo(() => {
    const resolved = resolveMediaUrl(rawMainMedia) ?? rawMainMedia ?? null;
    if (!resolved) return resolved;
    return resolved;
  }, [rawMainMedia]);
  const optimizedLogoUri = useMemo(() => {
    if (!ad.businessLogo) return null;
    return resolveMediaUrl(ad.businessLogo) ?? ad.businessLogo;
  }, [ad.businessLogo]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerLeft}
          onPress={() => router.push(`/(drawer)/ads/${ad._id}`)}
        >
          {optimizedLogoUri ? (
            <CachedImage
              source={{ uri: optimizedLogoUri }}
              style={styles.logo}
              contentFit="cover"
              transition={140}
              targetWidth={AD_LOGO_PIXEL_WIDTH}
            />
          ) : (
            <View
              style={[styles.logoPlaceholder, { backgroundColor: theme.border }]}
            >
              <MaterialCommunityIcons
                name="store"
                size={20}
                color={theme.subtext}
              />
            </View>
          )}
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={[styles.businessName, { color: theme.text }]}>
                {ad.businessName}
              </Text>
              <VerifiedBadge isVerified={ad.isVerified} size={14} />
            </View>
            <Text style={[styles.sponsoredLabel, { color: theme.subtext }]}>
              {ad.label || "Sponsored"}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={12}>
          <Feather name="more-horizontal" size={20} color={theme.subtext} />
        </Pressable>
      </View>

      {menuOpen && (
        <View
          style={[
            styles.menu,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Pressable style={styles.menuItem} onPress={handleHide}>
            <Text style={{ color: theme.text }}>Hide ad</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={handleReport}>
            <Text style={{ color: "#ef4444" }}>Report ad</Text>
          </Pressable>
        </View>
      )}

      {!!ad.caption && (
        <Text style={[styles.caption, { color: theme.text }]}>{ad.caption}</Text>
      )}

      {mainMedia?.url && (
        <Pressable onPress={() => router.push(`/(drawer)/ads/${ad._id}`)}>
          {mainMediaUri ? (
            <CachedImage
              source={{ uri: mainMediaUri }}
              style={styles.media}
              contentFit="cover"
              transition={160}
              targetWidth={AD_MEDIA_PIXEL_WIDTH}
            />
          ) : (
            <View style={[styles.media, { backgroundColor: theme.border }]}>
              <MediaSkeleton style={StyleSheet.absoluteFill} borderRadius={12} />
            </View>
          )}
          {isMainMediaVideo && (
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={56} color="#fff" />
            </View>
          )}
        </Pressable>
      )}

      {isCarousel && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.carouselDots}
          contentContainerStyle={styles.carouselDotsInner}
        >
          {media.map((m, i) => (
            <Pressable key={i} onPress={() => setCarouselIndex(i)}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === carouselIndex ? theme.primary : theme.border,
                  },
                ]}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable
        style={[styles.ctaButton, { backgroundColor: theme.primary || "#1e40af" }]}
        onPress={handleCta}
      >
        <Text style={styles.ctaText}>
          {ad.ctaLabel || "Learn More"}
        </Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, styles.actionBubbleHost]}
          onPress={handleLike}
        >
          <LikeBubbles burstKey={likeBurstKey} color="#ef4444" />
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={22}
            color={liked ? "#ef4444" : theme.subtext}
          />
          <Text style={[styles.actionCount, { color: theme.subtext }]}>
            {(ad.likeCount || 0) + (liked ? 1 : 0)}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push(`/(drawer)/ads/${ad._id}`)}
        >
          <Ionicons name="chatbubble-outline" size={21} color={theme.subtext} />
          <Text style={[styles.actionCount, { color: theme.subtext }]}>
            {ad.commentCount || 0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={theme.subtext} />
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleSave}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={saved ? theme.primary : theme.subtext}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function SponsoredAdSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <ActivityIndicator color={theme.primary} style={{ padding: 48 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  logo: { width: 44, height: 44, borderRadius: 22 },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { marginLeft: 10, flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  businessName: { fontWeight: "700", fontSize: 15 },
  sponsoredLabel: { fontSize: 12, marginTop: 2 },
  menu: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: { padding: 14 },
  caption: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    fontSize: 15,
    lineHeight: 21,
  },
  media: {
    width: SCREEN_WIDTH - 24,
    height: (SCREEN_WIDTH - 24) * 0.62,
    alignSelf: "center",
    borderRadius: 12,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  carouselDots: { maxHeight: 24, marginVertical: 8 },
  carouselDotsInner: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 14,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 10,
    gap: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  actionBubbleHost: {
    position: "relative",
    overflow: "visible",
  },
  actionCount: { fontSize: 13 },
});
