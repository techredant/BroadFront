import { useCallback, useEffect, useState } from "react";
import type { Call } from "@stream-io/video-react-native-sdk";
import type { MarketLiveProduct } from "@/utils/marketLive";
import {
  buildMarketLiveCustom,
  productFromLiveCustom,
} from "@/utils/marketLive";
import { LIVE_EVENT } from "@/utils/livestreamSession";

type Options = {
  call: Call | null | undefined;
  custom: Record<string, unknown> | undefined;
  isHost: boolean;
};

export function usePinnedLiveProduct({ call, custom, isHost }: Options) {
  const [pinned, setPinned] = useState<MarketLiveProduct | null>(() =>
    productFromLiveCustom(custom),
  );

  useEffect(() => {
    setPinned(productFromLiveCustom(custom));
  }, [custom]);

  const applyProduct = useCallback((product: MarketLiveProduct | null) => {
    setPinned(product);
  }, []);

  const pinProduct = useCallback(
    async (product: MarketLiveProduct) => {
      if (!call || !isHost) return;
      const hostId =
        (call.state.custom as { hostUserId?: string })?.hostUserId ??
        call.state.createdBy?.id ??
        "";
      const custom = buildMarketLiveCustom({
        hostClerkId: hostId,
        product,
      });
      await call.update({
        custom: { ...custom, pinnedAt: Date.now() },
      });
      await call.sendCustomEvent({
        type: LIVE_EVENT.PIN_PRODUCT,
        productId: product.productId,
        productTitle: product.title,
        productPrice: product.price,
        productImage: product.image,
      });
      setPinned(product);
    },
    [call, isHost],
  );

  const unpinProduct = useCallback(async () => {
    if (!call || !isHost) return;
    const existing = { ...(call.state.custom ?? {}) } as Record<string, unknown>;
    delete existing.productId;
    delete existing.productTitle;
    delete existing.productPrice;
    delete existing.productImage;
    delete existing.pinnedAt;
    await call.update({ custom: existing });
    await call.sendCustomEvent({ type: LIVE_EVENT.UNPIN_PRODUCT });
    setPinned(null);
  }, [call, isHost]);

  const handlePinEvent = useCallback(
    (payload: Record<string, unknown>) => {
      if (payload.type === LIVE_EVENT.UNPIN_PRODUCT) {
        setPinned(null);
        return;
      }
      if (payload.type === LIVE_EVENT.PIN_PRODUCT && payload.productId) {
        setPinned({
          productId: String(payload.productId),
          title: String(payload.productTitle ?? "Product"),
          price: Number(payload.productPrice) || 0,
          image:
            typeof payload.productImage === "string"
              ? payload.productImage
              : undefined,
        });
      }
    },
    [],
  );

  return {
    pinnedProduct: pinned,
    pinProduct,
    unpinProduct,
    applyProduct,
    handlePinEvent,
  };
}
