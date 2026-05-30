import type { Call } from "@stream-io/video-react-native-sdk";
import type { Router } from "expo-router";

export const STREAM_KIND_MARKET = "market" as const;
export const STREAM_KIND_COMMUNITY = "community" as const;

export type StreamKind =
  | typeof STREAM_KIND_MARKET
  | typeof STREAM_KIND_COMMUNITY;

export type MarketLiveProduct = {
  productId: string;
  title: string;
  price: number;
  image?: string;
};

/** Full product payload for go-live (avoids huge image URLs in route params). */
let stashedMarketLiveProduct: MarketLiveProduct | null = null;

export function stashMarketLiveProduct(product: MarketLiveProduct) {
  stashedMarketLiveProduct = product;
}

export function consumeStashedMarketLiveProduct(): MarketLiveProduct | null {
  const product = stashedMarketLiveProduct;
  stashedMarketLiveProduct = null;
  return product;
}

export type MarketLiveParams = {
  productId?: string;
  productTitle?: string;
  productPrice?: string;
  productImage?: string;
};

export function marketLiveParamsFromProduct(
  product: MarketLiveProduct,
): MarketLiveParams {
  return {
    productId: product.productId,
    productTitle: product.title,
    productPrice: String(product.price),
    // Omit image from route params — long URLs break navigation / Stream custom limits
  };
}

/** Parse host / product from `market_{productId?}_{hostId}_{timestamp}` call ids. */
export function parseMarketCallId(callId: string): {
  productId?: string;
  hostId?: string;
} {
  if (!callId.startsWith("market_")) return {};

  const rest = callId.slice(7);
  const lastSep = rest.lastIndexOf("_");
  if (lastSep <= 0) return {};

  const ts = rest.slice(lastSep + 1);
  if (!/^\d+$/.test(ts)) return {};

  const middle = rest.slice(0, lastSep);
  const productMatch = middle.match(/^([a-f0-9]{24})_(.+)$/i);
  if (productMatch) {
    return { productId: productMatch[1], hostId: productMatch[2] };
  }

  return { hostId: middle };
}

export function isMarketLiveCall(call: Call): boolean {
  const custom = call.state?.custom as Record<string, unknown> | undefined;
  if (custom?.streamKind === STREAM_KIND_MARKET) return true;
  if (custom?.marketLive === true) return true;
  return call.id.startsWith("market_") || call.id.startsWith("mkt_");
}

export function isCommunityLiveCall(call: Call): boolean {
  return !isMarketLiveCall(call);
}

/** Short unique id — product/host metadata lives in call `custom`, not the id string. */
export function marketLiveCallId(
  _hostClerkId: string,
  _productId?: string,
): string {
  const stamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 10);
  return `mkt_${stamp}_${nonce}`;
}

/** Stream custom payload (keep small — large image URLs can fail getOrCreate). */
export function buildMarketLiveCustom(params: {
  hostClerkId: string;
  roomTitle?: string;
  level?: string;
  product?: MarketLiveProduct | null;
}): Record<string, string | number | boolean> {
  const custom: Record<string, string | number | boolean> = {
    title: (params.roomTitle ?? "Market Live").slice(0, 200),
    level: params.level ?? "home",
    streamKind: STREAM_KIND_MARKET,
    hostUserId: params.hostClerkId,
    marketLive: true,
  };

  const product = params.product;
  if (product?.productId) {
    custom.productId = product.productId;
    custom.productTitle = String(product.title ?? "Product").slice(0, 200);
    custom.productPrice = Number(product.price) || 0;
    const image = product.image?.trim();
    if (image && image.length <= 480) {
      custom.productImage = image;
    }
  }

  return custom;
}

/** Open the dedicated Market Live hub (not the community Live tab). */
export function goToMarketLive(
  router: Router,
  product?: MarketLiveProduct,
) {
  if (product) {
    stashMarketLiveProduct(product);
  }
  router.push({
    pathname: "/(drawer)/(market)/live",
    params: product
      ? {
          ...marketLiveParamsFromProduct(product),
          startMarketLive: "1",
        }
      : { startMarketLive: "1" },
  });
}

export function parseMarketLiveParams(
  params: Record<string, string | string[] | undefined>,
): MarketLiveProduct | null {
  const productId =
    typeof params.productId === "string"
      ? params.productId
      : Array.isArray(params.productId)
        ? params.productId[0]
        : undefined;

  if (!productId) return null;

  const title =
    typeof params.productTitle === "string"
      ? params.productTitle
      : "Live sale";
  const priceRaw =
    typeof params.productPrice === "string"
      ? params.productPrice
      : "0";
  const image =
    typeof params.productImage === "string"
      ? params.productImage
      : undefined;

  return {
    productId,
    title,
    price: Number(priceRaw) || 0,
    image,
  };
}

export type LiveStreamProductCustom = {
  title?: string;
  level?: string;
  streamKind?: StreamKind;
  hostUserId?: string;
  productId?: string;
  productTitle?: string;
  productPrice?: number | string;
  productImage?: string;
  marketLive?: boolean;
};

export function streamKindFromCustom(
  custom: Record<string, unknown> | undefined,
): StreamKind {
  if (custom?.streamKind === STREAM_KIND_MARKET || custom?.marketLive === true) {
    return STREAM_KIND_MARKET;
  }
  return STREAM_KIND_COMMUNITY;
}

export function productFromLiveCustom(
  custom: Record<string, unknown> | undefined,
): MarketLiveProduct | null {
  if (streamKindFromCustom(custom) !== STREAM_KIND_MARKET) return null;
  if (!custom?.productId || typeof custom.productId !== "string") return null;
  return {
    productId: custom.productId,
    title:
      typeof custom.productTitle === "string"
        ? custom.productTitle
        : "Product",
    price: Number(custom.productPrice) || 0,
    image:
      typeof custom.productImage === "string"
        ? custom.productImage
        : undefined,
  };
}
