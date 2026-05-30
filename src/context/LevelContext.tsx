// levelContext
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { AppState } from "react-native";

import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Socket } from "socket.io-client";

import { Post } from "@/types/post";
import { API_PUBLIC_URL, SOCKET_IO_DISABLED_ON_HOST, HOSTED_FEED_REFRESH_MS } from "@/constants/api";
import {
  bindLevelRooms,
  createFeedSocket,
} from "@/utils/feedSocket";
import { bindPresenceSocket } from "@/utils/presenceSocket";
import { useFeedPresenceSync } from "@/hooks/useFeedPresenceSync";
import { AI_FEED_ENABLED } from "@/hooks/useAIRankedFeed";
import { getFeedRoomsForViewer } from "@/utils/feedRooms";
import { fetchRemovedPostIds, filterRemovedPosts } from "@/utils/postVisibility";

const BASE_URL = API_PUBLIC_URL;

/** Keep feed lists free of duplicate _id keys (FlatList / React warnings). */
function dedupePostsById<T extends { _id?: string }>(posts: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const post of posts) {
    const id = String(post?._id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(post);
  }
  return result;
}

function postTimestamp(post: { createdAt?: string; updatedAt?: string }) {
  const raw = post.createdAt || post.updatedAt;
  const parsed = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Keep the feed stable: no duplicate IDs and newest posts first. */
function normalizeFeedPosts<T extends { _id?: string; createdAt?: string; updatedAt?: string }>(
  posts: T[],
): T[] {
  return dedupePostsById(posts).sort((a, b) => postTimestamp(b) - postTimestamp(a));
}

function mergeRefreshedFeedPage<T extends { _id?: string; createdAt?: string; updatedAt?: string }>(
  existing: T[],
  refreshedPage: T[],
): T[] {
  if (refreshedPage.length === 0) {
    return existing;
  }

  const refreshedIds = new Set(
    refreshedPage.map((post) => String(post?._id ?? "")),
  );
  const tail = existing
    .slice(refreshedPage.length)
    .filter((post) => !refreshedIds.has(String(post?._id ?? "")));

  return normalizeFeedPosts([...refreshedPage, ...tail] as Post[]) as T[];
}

interface Level {
  type: string;
  value: string;
}

interface LevelContextType {
  currentLevel: Level | null;

  posts: Post[];
  loadingPosts: boolean;
  loadingMore: boolean;
  hasMorePosts: boolean;

  userDetails: any;
  isLoadingUser: boolean;

  refreshUserDetails: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;

  updateUserDetails: (patch: any) => void;

  switchLevel: (level: Level) => void;

  updatePost: (updated: Post) => void;
  prependPost: (post: any) => void;
  replacePost: (tempId: string, realPost: any) => void;
  removePost: (postId: string) => void;

  socket: Socket | null;
}

const LevelContext = createContext<LevelContextType | undefined>(undefined);

export const LevelProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const socketRef = useRef<Socket | null>(null);

  const [socket, setSocket] = useState<Socket | null>(null);

  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const loadingMoreRef = useRef(false);

  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const userDetailsRef = useRef<any>(null);

  const hasInitializedLevel = useRef(false);

  // 🚀 CACHE
  const feedCache = useRef<Record<string, Post[]>>({});
  const feedPage = useRef<Record<string, number>>({});
  const hasMoreRef = useRef<Record<string, boolean>>({});
  const deleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const getKey = (level: Level) => {
    return `${level.type}-${level.value}`;
  };

  /* ---------------- USER ---------------- */

  userDetailsRef.current = userDetails;

  const refreshUserDetails = useCallback(async () => {
    if (!user) {
      setIsLoadingUser(false);
      return;
    }

    const showLoading = !userDetailsRef.current;
    if (showLoading) {
      setIsLoadingUser(true);
    }

    try {
      const token = await getToken();

      const res = await axios.get(`${BASE_URL}/api/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res.data;

      setUserDetails(data);

      if (!hasInitializedLevel.current) {
        if (data?.home) {
          setCurrentLevel({
            type: "home",
            value: data.home,
          });
        } else if (data?.county) {
          setCurrentLevel({
            type: "county",
            value: data.county,
          });
        } else if (data?.constituency) {
          setCurrentLevel({
            type: "constituency",
            value: data.constituency,
          });
        } else {
          setCurrentLevel({
            type: "ward",
            value: data.ward || "ward",
          });
        }

        hasInitializedLevel.current = true;
      }
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status !== 404) {
        console.log(err);
      }
    } finally {
      if (showLoading) {
        setIsLoadingUser(false);
      }
    }
  }, [user?.id, getToken]);

  /* ---------------- FETCH POSTS ---------------- */

const fetchPosts = useCallback(
  async (
    level: Level,
    options?: { refresh?: boolean; loadMore?: boolean; silent?: boolean },
  ) => {
    const refresh = options?.refresh ?? false;
    const loadMorePage = options?.loadMore ?? false;
    const silent = options?.silent ?? false;
    const key = getKey(level);

    const cached = feedCache.current[key];

    if (loadMorePage) {
      if (loadingMoreRef.current || !hasMoreRef.current[key]) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (cached && !refresh) {
      setPosts(normalizeFeedPosts(cached));
      setHasMorePosts(hasMoreRef.current[key] !== false);
    } else if (!silent) {
      setLoadingPosts(true);
    }

    try {
      const page = refresh ? 1 : feedPage.current[key] || 1;

      const aiUserId = userDetailsRef.current?.clerkId;
      const useAI =
        AI_FEED_ENABLED &&
        !!aiUserId &&
        !loadMorePage &&
        !refresh &&
        !silent &&
        level.type !== "ward";
      const res = useAI
        ? await axios.get<{ posts: Post[] }>(`${BASE_URL}/api/ai/feed`, {
            params: {
              userId: aiUserId,
              levelType: level.type,
              levelValue: level.value,
              limit: 20,
            },
          })
        : await axios.get<Post[]>(
            `${BASE_URL}/api/posts?levelType=${level.type}&levelValue=${level.value}&page=${page}&limit=10`,
          );

      const data = normalizeFeedPosts(
        (useAI ? (res.data as { posts: Post[] }).posts : (res.data as Post[])) ??
          [],
      );

      if (refresh || page === 1) {
        const previous = feedCache.current[key] || [];
        const nextPosts =
          refresh && previous.length > 0
            ? mergeRefreshedFeedPage(previous, data)
            : data;

        const removedIds = await fetchRemovedPostIds(
          nextPosts.map((post) => String(post._id ?? "")),
        );
        const finalPosts = filterRemovedPosts(nextPosts, removedIds);

        feedCache.current[key] = finalPosts;
        setPosts(finalPosts);
        feedPage.current[key] =
          refresh && previous.length > data.length
            ? Math.max(feedPage.current[key] || 2, 2)
            : 2;
      } else {
        const merged = normalizeFeedPosts([
          ...(feedCache.current[key] || []),
          ...data,
        ]);
        feedCache.current[key] = merged;
        setPosts(merged);
        feedPage.current[key] = page + 1;
      }

      const more = data.length === 10;
      hasMoreRef.current[key] = more;
      setHasMorePosts(more);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  },
  [],
);

  /* ---------------- SWITCH LEVEL ---------------- */

  const switchLevel = useCallback(
    (level: Level) => {
      const key = getKey(level);

      // 🚀 INSTANT FEED
      const cached = feedCache.current[key];

      if (cached) {
        setPosts(normalizeFeedPosts(cached));
        setHasMorePosts(hasMoreRef.current[key] !== false);
      } else {
        setPosts([]);
        setHasMorePosts(true);
      }

      // ✅ switch immediately
      setCurrentLevel(level);

      // 🌐 background refresh
      setTimeout(() => {
        fetchPosts(level, {
          refresh: true,
        });
      }, 50);
    },
    [fetchPosts],
  );

  /* ---------------- REFRESH ---------------- */

  const refreshFeed = async () => {
    if (!currentLevel) return;

    await fetchPosts(currentLevel, {
      refresh: true,
    });
  };

  /* ---------------- LOAD MORE ---------------- */

  const loadMore = async () => {
    if (!currentLevel || loadingMoreRef.current) return;

    const key = getKey(currentLevel);

    if (hasMoreRef.current[key] === false) return;

    await fetchPosts(currentLevel, { loadMore: true });
  };

  /* ---------------- SOCKET ---------------- */

  useEffect(() => {
    if (!currentLevel) return;

    socketRef.current?.disconnect();
    setSocket(null);

    if (SOCKET_IO_DISABLED_ON_HOST) {
      return;
    }

    const newSocket = createFeedSocket();

    socketRef.current = newSocket;

    setSocket(newSocket);

    const clerkId = userDetails?.clerkId ?? user?.id;
    const unbindPresence = bindPresenceSocket(newSocket, clerkId);

    const rooms = getFeedRoomsForViewer(currentLevel.type, currentLevel.value);
    const leaveRooms = bindLevelRooms(newSocket, rooms);

    newSocket.on("newPost", (post: Post) => {
      setPosts((prev) => {
        const withoutMatchingTemp = prev.filter((p) => {
          if (typeof p._id !== "string" || !p._id.startsWith("temp-")) {
            return true;
          }
          return !(
            p.userId === (post as any).userId &&
            String(p.originalPostId) === String((post as any).originalPostId) &&
            p.type === (post as any).type
          );
        });

        const incomingId = String((post as any)._id);
        if (
          withoutMatchingTemp.some((p) => String(p._id) === incomingId)
        ) {
          return withoutMatchingTemp;
        }

        const normalized = { ...(post as any), _id: incomingId };
        const updated = normalizeFeedPosts([
          normalized,
          ...withoutMatchingTemp,
        ]);

        feedCache.current[getKey(currentLevel)] = updated;

        return updated;
      });
    });

    newSocket.on("deletePost", (postId: string) => {
      const id = String(postId);
      setPosts((prev) => {
        const updated = prev.filter((p) => String(p._id) !== id);

        feedCache.current[getKey(currentLevel)] = updated;

        return updated;
      });
    });

    newSocket.on("feed:rankUpdated", () => {
      void fetchPosts(currentLevel, { refresh: true, silent: true });
    });

    const handlePostUpdated = (updatedPost: Post) => {
      const updatedId = String(updatedPost?._id ?? "");
      if (!updatedId) return;

      setPosts((prev) => {
        const index = prev.findIndex((p) => String(p._id) === updatedId);
        if (index === -1) return prev;

        const next = [...prev];
        next[index] = { ...(next[index] as any), ...(updatedPost as any) };
        const normalized = normalizeFeedPosts(next);
        feedCache.current[getKey(currentLevel)] = normalized;
        return normalized;
      });
    };

    newSocket.on("updatePost", handlePostUpdated);
    newSocket.on("postUpdated", handlePostUpdated);

    return () => {
      newSocket.off("updatePost", handlePostUpdated);
      newSocket.off("postUpdated", handlePostUpdated);
      newSocket.off("feed:rankUpdated");
      unbindPresence();
      leaveRooms();
      newSocket.disconnect();
    };
  }, [currentLevel, userDetails?.clerkId, user?.id]);

  useEffect(() => {
    if (!SOCKET_IO_DISABLED_ON_HOST || !currentLevel) return;

    let currentAppState = AppState.currentState;
    let isRefreshing = false;

    const refreshHostedFeed = async () => {
      if (currentAppState !== "active" || isRefreshing) return;
      isRefreshing = true;
      try {
        await fetchPosts(currentLevel, { refresh: true, silent: true });
      } finally {
        isRefreshing = false;
      }
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      currentAppState = nextState;
      if (nextState === "active") {
        void refreshHostedFeed();
      }
    });

    const interval = setInterval(() => {
      void refreshHostedFeed();
    }, HOSTED_FEED_REFRESH_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [currentLevel, fetchPosts]);

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    if (!user?.id) return;

    refreshUserDetails();
  }, [user?.id, refreshUserDetails]);

  /* ---------------- INITIAL FETCH ---------------- */
useEffect(() => {
  if (!currentLevel) return;

  const key = getKey(currentLevel);

  const cached = feedCache.current[key];

  if (!cached) {
    setLoadingPosts(true); // 🔥 only first time
  }

  fetchPosts(currentLevel, { refresh: true });
}, [currentLevel]);

  const syncCache = useCallback(
    (nextPosts: Post[]) => {
      if (!currentLevel) return;
      feedCache.current[getKey(currentLevel)] = normalizeFeedPosts(nextPosts);
    },
    [currentLevel],
  );

  const updatePost = useCallback(
    (updated: Post) => {
      setPosts((prev) => {
        const index = prev.findIndex((p) => p._id === updated._id);
        if (index === -1) return prev;

        const newPosts = [...prev];
        newPosts[index] = updated;
        const normalized = normalizeFeedPosts(newPosts);
        syncCache(normalized);
        return normalized;
      });
    },
    [syncCache],
  );

  const prependPost = useCallback(
    (post: any) => {
      const id = String(post._id);
      setPosts((prev) => {
        if (prev.some((p) => String(p._id) === id)) return prev;
        const updated = normalizeFeedPosts([{ ...post, _id: id }, ...prev]);
        syncCache(updated);
        return updated;
      });
    },
    [syncCache],
  );

  const replacePost = useCallback(
    (tempId: string, realPost: any) => {
      const realId = String(realPost._id);
      setPosts((prev) => {
        const withoutTempAndDup = prev.filter(
          (p) => String(p._id) !== tempId && String(p._id) !== realId,
        );
        const updated = normalizeFeedPosts([
          { ...realPost, _id: realId },
          ...withoutTempAndDup,
        ]);
        syncCache(updated);
        return updated;
      });
    },
    [syncCache],
  );

  const removePost = useCallback(
    (postId: string) => {
      const id = String(postId);
      setPosts((prev) => {
        const hasPost = prev.some((p) => String(p._id) === id);
        if (!hasPost) return prev;

        const updated = normalizeFeedPosts(
          prev.map((p) =>
            String(p._id) === id
              ? ({ ...(p as any), __isDeleting: true } as Post)
              : p,
          ),
        );
        syncCache(updated);
        return updated;
      });

      if (deleteTimers.current[id]) {
        clearTimeout(deleteTimers.current[id]);
      }

      deleteTimers.current[id] = setTimeout(() => {
        setPosts((prev) => {
          const updated = normalizeFeedPosts(
            prev.filter((p) => String(p._id) !== id),
          );
          syncCache(updated);
          return updated;
        });
        delete deleteTimers.current[id];
      }, 220);
    },
    [syncCache],
  );

  const updateUserDetails = (patch: any) => {
    setUserDetails((prev: any) => ({
      ...prev,
      ...patch,
    }));
  };

  useFeedPresenceSync(posts);

  return (
    <LevelContext.Provider
      value={{
        currentLevel,

        posts,
        loadingPosts,
        loadingMore,
        hasMorePosts,

        userDetails,
        isLoadingUser,

        refreshUserDetails,
        refreshFeed,
        loadMore,

        updateUserDetails,

        switchLevel,
        updatePost,
        prependPost,
        replacePost,
        removePost,

        socket,
      }}
    >
      {children}
    </LevelContext.Provider>
  );
};

export const useLevel = () => {
  const context = useContext(LevelContext);

  if (!context) {
    throw new Error("useLevel must be used inside LevelProvider");
  }

  return context;
};
