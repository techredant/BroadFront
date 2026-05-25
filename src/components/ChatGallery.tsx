import { MarketProductLink } from "@/components/MarketProductLink";
import { ChatStoryLink } from "@/components/ChatStoryLink";
import {
  resolveProductId,
  resolveProductMeta,
} from "@/utils/streamProduct";
import {
  resolveStoryReplyMeta,
  viewerPathForStoryUser,
} from "@/utils/streamStory";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { Attachment } from "stream-chat";
import {
  useImageGalleryContext,
  useMessageContext,
  useOverlayContext,
} from "stream-chat-expo";
import type { GalleryProps } from "stream-chat-expo";

const MAX_HEIGHT = 380;
const MIN_HEIGHT = 72;
const GRID_GAP = 4;
const MAX_GRID_TILES = 4;

function attachmentUrl(att: Attachment) {
  return att.image_url || att.thumb_url || att.asset_url || "";
}

function aspectFromAttachment(att: Attachment) {
  const w = att.original_width;
  const h = att.original_height;
  if (w && h && h > 0) {
    const ratio = w / h;
    if (ratio > 0.15 && ratio < 6) return ratio;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function bubbleRadii(alignment: "left" | "right") {
  return {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: alignment === "right" ? 16 : 4,
    borderBottomRightRadius: alignment === "right" ? 4 : 16,
  };
}

type MediaCellProps = {
  attachment: Attachment;
  width: number;
  height: number;
  cellStyle?: object;
  overflowLabel?: string;
  productId?: string;
  storyUserId?: string;
};

function MediaCell({
  attachment,
  width,
  height,
  cellStyle,
  overflowLabel,
  productId,
  storyUserId,
}: MediaCellProps) {
  const router = useRouter();
  const { message, onLongPress, onPress, onPressIn, preventPress } =
    useMessageContext();
  const { setMessages, setSelectedMessage } = useImageGalleryContext();
  const { setOverlay } = useOverlayContext();

  const uri = attachmentUrl(attachment);
  const isVideo = attachment.type === "video";

  const openViewer = useCallback(() => {
    if (!message || !uri) return;
    setMessages([message]);
    setSelectedMessage({ messageId: message.id, url: uri });
    setOverlay("gallery");
  }, [message, uri, setMessages, setSelectedMessage, setOverlay]);

  const openProduct = useCallback(() => {
    if (!productId) return;
    router.push(`/(drawer)/(market)/${productId}`);
  }, [productId, router]);

  const openStory = useCallback(() => {
    if (!storyUserId) return;
    router.push(viewerPathForStoryUser(storyUserId));
  }, [storyUserId, router]);

  if (!uri) return null;

  return (
    <Pressable
      disabled={preventPress}
      onPress={(event) => {
        if (productId) {
          openProduct();
          return;
        }
        if (storyUserId) {
          openStory();
          return;
        }
        onPress?.({
          additionalInfo: { attachment },
          defaultHandler: openViewer,
          emitter: "gallery",
          event,
        });
      }}
      onLongPress={(event) =>
        onLongPress?.({ additionalInfo: { attachment }, emitter: "gallery", event })
      }
      onPressIn={(event) => {
        if (productId || storyUserId) return;
        onPressIn?.({
          additionalInfo: { attachment },
          defaultHandler: openViewer,
          emitter: "gallery",
          event,
        });
      }}
      style={[{ width, height, overflow: "hidden" }, cellStyle]}
    >
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      {isVideo ? (
        <View style={styles.playWrap} pointerEvents="none">
          <View style={styles.playBtn}>
            <Ionicons name="play" size={22} color="#000" />
          </View>
        </View>
      ) : null}
      {overflowLabel ? (
        <View style={styles.overflow} pointerEvents="none">
          <Text style={styles.overflowText}>{overflowLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type SingleProps = {
  attachment: Attachment;
  maxWidth: number;
  alignment: "left" | "right";
  productId?: string;
  storyUserId?: string;
};

function SingleMediaAttachment({
  attachment,
  maxWidth,
  alignment,
  productId,
  storyUserId,
}: SingleProps) {
  const uri = attachmentUrl(attachment);
  const [aspect, setAspect] = useState<number>(
    () => aspectFromAttachment(attachment) ?? 4 / 3,
  );

  useEffect(() => {
    if (!uri) return;
    const fromMeta = aspectFromAttachment(attachment);
    if (fromMeta) {
      setAspect(fromMeta);
      return;
    }
    RNImage.getSize(
      uri,
      (w, h) => {
        if (h > 0) {
          const ratio = w / h;
          if (ratio > 0.15 && ratio < 6) setAspect(ratio);
        }
      },
      () => {},
    );
  }, [uri, attachment.original_width, attachment.original_height]);

  const width = maxWidth;
  const height = clamp(width / aspect, MIN_HEIGHT, MAX_HEIGHT);

  return (
    <MediaCell
      attachment={attachment}
      width={width}
      height={height}
      cellStyle={bubbleRadii(alignment)}
      productId={productId}
      storyUserId={storyUserId}
    />
  );
}

type MultiProps = {
  items: Attachment[];
  maxWidth: number;
  alignment: "left" | "right";
  productId?: string;
  storyUserId?: string;
};

function MultiMediaGallery({
  items,
  maxWidth,
  alignment,
  productId,
  storyUserId,
}: MultiProps) {
  const tiles = items.slice(0, MAX_GRID_TILES);
  const overflow = items.length - MAX_GRID_TILES;
  const count = tiles.length;

  const isTwo = count === 2;
  const cellW = isTwo ? (maxWidth - GRID_GAP) / 2 : (maxWidth - GRID_GAP) / 2;
  const cellH = isTwo ? cellW * 0.85 : cellW;
  const rows = Math.ceil(count / 2);
  const gridHeight = rows * cellH + (rows - 1) * GRID_GAP;

  return (
    <View
      style={[
        styles.grid,
        bubbleRadii(alignment),
        { width: maxWidth, height: gridHeight },
      ]}
    >
      {tiles.map((attachment, idx) => {
        const isLast = idx === MAX_GRID_TILES - 1 && overflow > 0;
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const isLastRowSingle = count % 2 === 1 && idx === count - 1;

        const w = isLastRowSingle ? maxWidth : cellW;
        const left = isLastRowSingle ? 0 : col * (cellW + GRID_GAP);
        const top = row * (cellH + GRID_GAP);

        return (
          <View
            key={`${attachmentUrl(attachment)}-${idx}`}
            style={{
              position: "absolute",
              left,
              top,
              width: w,
              height: cellH,
            }}
          >
            <MediaCell
              attachment={attachment}
              width={w}
              height={cellH}
              overflowLabel={isLast ? `+${overflow}` : undefined}
              productId={productId}
              storyUserId={storyUserId}
            />
          </View>
        );
      })}
    </View>
  );
}

/**
 * Drop-in Gallery replacement — reads images/videos from MessageContext.
 */
export function ChatGallery(_props: GalleryProps) {
  const { width: screenW } = useWindowDimensions();
  const {
    alignment: ctxAlignment,
    images: ctxImages,
    videos: ctxVideos,
    message,
  } = useMessageContext();

  const items = useMemo(
    () => [...(ctxImages ?? []), ...(ctxVideos ?? [])],
    [ctxImages, ctxVideos],
  );

  const alignment = ctxAlignment ?? "left";
  const maxWidth = Math.min(screenW * 0.72, 280);
  const productMeta = useMemo(
    () => resolveProductMeta(message, items[0]),
    [message, items],
  );
  const storyMeta = useMemo(() => resolveStoryReplyMeta(message), [message]);

  if (!items.length) {
    if (storyMeta?.statusUserId) {
      return (
        <ChatStoryLink
          statusUserId={storyMeta.statusUserId}
          caption={storyMeta.storyCaption}
        />
      );
    }
    return null;
  }

  const storyUserId = storyMeta?.statusUserId;

  const gallery =
    items.length === 1 ? (
      <SingleMediaAttachment
        attachment={items[0]}
        maxWidth={maxWidth}
        alignment={alignment}
        productId={productMeta.productId}
        storyUserId={storyUserId}
      />
    ) : (
      <MultiMediaGallery
        items={items}
        maxWidth={maxWidth}
        alignment={alignment}
        productId={productMeta.productId}
        storyUserId={storyUserId}
      />
    );

  if (productMeta.productId) {
    return (
      <View style={{ maxWidth }}>
        {gallery}
        <MarketProductLink
          productId={productMeta.productId}
          title={productMeta.title}
          price={productMeta.price}
        />
      </View>
    );
  }

  if (storyUserId) {
    return (
      <View style={{ maxWidth }}>
        {gallery}
        <ChatStoryLink
          statusUserId={storyUserId}
          caption={storyMeta?.storyCaption}
        />
      </View>
    );
  }

  return gallery;
}

const styles = StyleSheet.create({
  grid: {
    overflow: "hidden",
    backgroundColor: "#000",
  },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  overflow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  overflowText: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "800",
  },
});
