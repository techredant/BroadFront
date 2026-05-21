// levelContext
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-expo";
import io, { Socket } from "socket.io-client";

import { Post } from "@/types/post";

const BASE_URL = "https://cast-api-zeta.vercel.app";

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
    } catch (err) {
      console.log(err);
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
    options?: { refresh?: boolean; loadMore?: boolean },
  ) => {
    const refresh = options?.refresh ?? false;
    const loadMorePage = options?.loadMore ?? false;
    const key = getKey(level);

    const cached = feedCache.current[key];

    if (loadMorePage) {
      if (loadingMoreRef.current || !hasMoreRef.current[key]) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (cached && !refresh) {
      setPosts(dedupePostsById(cached));
      setHasMorePosts(hasMoreRef.current[key] !== false);
    } else {
      setLoadingPosts(true);
    }

    try {
      const page = refresh ? 1 : feedPage.current[key] || 1;

      const res = await axios.get<Post[]>(
        `${BASE_URL}/api/posts?levelType=${level.type}&levelValue=${level.value}&page=${page}&limit=10`,
      );

      const data = dedupePostsById(res.data ?? []);

      if (refresh || page === 1) {
        feedCache.current[key] = data;
        setPosts(data);
        feedPage.current[key] = 2;
      } else {
        const merged = dedupePostsById([
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
        setPosts(dedupePostsById(cached));
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

    const newSocket = io(BASE_URL, {
      transports: ["websocket"],
    });

    socketRef.current = newSocket;

    setSocket(newSocket);

    const room = `level-${currentLevel.type}-${currentLevel.value}`;

    newSocket.emit("joinRoom", room);

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
        const updated = dedupePostsById([
          normalized,
          ...withoutMatchingTemp,
        ]);

        feedCache.current[getKey(currentLevel)] = updated;

        return updated;
      });
    });

    newSocket.on("deletePost", (postId: string) => {
      setPosts((prev) => {
        const updated = prev.filter((p) => p._id !== postId);

        feedCache.current[getKey(currentLevel)] = updated;

        return updated;
      });
    });

    return () => {
      newSocket.emit("leaveRoom", room);

      newSocket.disconnect();
    };
  }, [currentLevel]);

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
      feedCache.current[getKey(currentLevel)] = nextPosts;
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
        syncCache(newPosts);
        return newPosts;
      });
    },
    [syncCache],
  );

  const prependPost = useCallback(
    (post: any) => {
      const id = String(post._id);
      setPosts((prev) => {
        if (prev.some((p) => String(p._id) === id)) return prev;
        const updated = dedupePostsById([{ ...post, _id: id }, ...prev]);
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
        const updated = dedupePostsById([
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
      setPosts((prev) => {
        const updated = prev.filter((p) => p._id !== postId);
        syncCache(updated);
        return updated;
      });
    },
    [syncCache],
  );

  const updateUserDetails = (patch: any) => {
    setUserDetails((prev: any) => ({
      ...prev,
      ...patch,
    }));
  };

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
