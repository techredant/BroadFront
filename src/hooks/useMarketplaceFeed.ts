import { useCallback, useRef, useState } from "react";
import { fetchProductFeed } from "@/services/marketplaceApi";
import type { MarketplaceProduct, ProductFilters } from "@/types/marketplace";

export function useMarketplaceFeed(filters: ProductFilters) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const filtersKey = JSON.stringify(filters);

  const loadPage = useCallback(
    async (page: number, replace: boolean) => {
      const res = await fetchProductFeed(page, filters);
      setProducts((prev) =>
        replace ? res.products : [...prev, ...res.products],
      );
      setHasMore(res.hasMore);
      pageRef.current = page;
    },
    [filtersKey],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPage(1, true);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadPage(pageRef.current + 1, false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadPage, loadingMore, hasMore]);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    pageRef.current = 1;
    try {
      await loadPage(1, true);
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  return {
    products,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    initialLoad,
  };
}
