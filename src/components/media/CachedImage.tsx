import React, { useEffect, useMemo, useState } from "react";
import { Image, type ImageProps } from "expo-image";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MotiView } from "moti";
import { buildCloudinaryUrl } from "@/utils/mediaUtils";

const pulseTransition = {
  loop: true,
  type: "timing" as const,
  duration: 900,
};

type MediaSkeletonProps = {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

export function MediaSkeleton({ style, borderRadius }: MediaSkeletonProps) {
  return (
    <MotiView
      from={{ opacity: 0.42 }}
      animate={{ opacity: 0.82 }}
      transition={pulseTransition}
      style={[styles.skeleton, borderRadius != null && { borderRadius }, style]}
    />
  );
}

type CachedImageProps = ImageProps & {
  skeletonStyle?: StyleProp<ViewStyle>;
  showSkeleton?: boolean;
  /**
   * Pixel width the image will render at. Forwarded to Cloudinary's
   * `w_<n>,c_limit` transform when `source.uri` lives on res.cloudinary.com
   * (or is a legacy /api/media/ URL wrapped via fetch). Pass through unchanged
   * for `require()` sources, third-party hosts, and local picker URIs.
   */
  targetWidth?: number;
};

export function CachedImage({
  style,
  skeletonStyle,
  showSkeleton = true,
  contentFit = "cover",
  cachePolicy = "memory-disk",
  transition = 150,
  onLoadStart,
  onLoadEnd,
  onError,
  source,
  targetWidth,
  ...props
}: CachedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const flattenedStyle = StyleSheet.flatten(style) as ViewStyle | undefined;
  const borderRadius =
    typeof flattenedStyle?.borderRadius === "number"
      ? flattenedStyle.borderRadius
      : undefined;

  const optimizedSource = useMemo(() => {
    if (source == null) return source;
    if (typeof source === "number") return source;
    if (typeof source === "string") {
      const next = buildCloudinaryUrl(source, { width: targetWidth });
      return next ?? source;
    }
    if (Array.isArray(source)) return source;
    const uri = (source as { uri?: unknown }).uri;
    if (typeof uri !== "string") return source;
    const next = buildCloudinaryUrl(uri, { width: targetWidth });
    if (!next || next === uri) return source;
    return { ...(source as object), uri: next };
  }, [source, targetWidth]);

  const sourceKey =
    typeof optimizedSource === "number" || typeof optimizedSource === "string"
      ? String(optimizedSource)
      : Array.isArray(optimizedSource)
        ? optimizedSource.map((item: any) => item?.uri ?? String(item)).join("|")
        : ((optimizedSource as any)?.uri ?? JSON.stringify(optimizedSource));

  useEffect(() => {
    setLoaded(false);
  }, [sourceKey]);

  return (
    <View style={[styles.wrap, style]}>
      <Image
        {...props}
        source={optimizedSource}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
        transition={transition}
        onLoadStart={() => {
          setLoaded(false);
          onLoadStart?.();
        }}
        onLoadEnd={() => {
          setLoaded(true);
          onLoadEnd?.();
        }}
        onError={(event) => {
          setLoaded(true);
          onError?.(event);
        }}
      />
      {showSkeleton && !loaded ? (
        <MediaSkeleton
          borderRadius={borderRadius}
          style={[StyleSheet.absoluteFill, skeletonStyle]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  skeleton: {
    backgroundColor: "rgba(148, 163, 184, 0.28)",
  },
});
