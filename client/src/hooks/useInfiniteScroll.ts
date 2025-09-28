import { useEffect, useCallback, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Custom hook for implementing infinite scroll functionality
 * Uses Intersection Observer for performance
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
  threshold = 0.8,
  rootMargin = '100px'
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const element = loadingRef.current;
    if (!element) return;

    // Disconnect previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold,
      rootMargin
    });

    // Start observing
    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold, rootMargin]);

  return { loadingRef };
}

/**
 * Hook for managing paginated data with infinite scroll
 */
import { useState } from 'react';

export function useInfiniteData<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn(page);
      setData(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading more data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, loading, hasMore]);

  // Reset when dependencies change
  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    loadMore();
  }, deps);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    refresh: () => {
      setData([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      loadMore();
    }
  };
}