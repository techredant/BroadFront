import { useUser } from "@clerk/clerk-expo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import React from "react";
import axios from "axios";

const BASE_URL = "https://cast-api-zeta.vercel.app/api/users";

/** =========================
 * Types
 * ========================= */
type FollowItem = string;

interface User {
  id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  nickName: string;
  image: string;
  followers: string[];
  following: string[];
}

type FollowContextType = {
  following: string[];
  followers: string[];
  members: User[];
  followerUsers: User[];
  followingUsers: User[];
  followersCount: number;
  followingCount: number;
  handleFollow: (targetClerkId: string) => Promise<void>;
  loading: boolean;
  error: any;
};

/** =========================
 * Context
 * ========================= */
const FollowCtx = createContext<FollowContextType | null>(null);

/** =========================
 * Provider
 * ========================= */
export const FollowProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch follow data");
    return res.json();
  };

  /** FOLLOW STATE (SWR) */
  const url = user?.id ? `${BASE_URL}/${user.id}/follow-state` : null;

  const { data, error, mutate } = useSWR(url, fetcher);

  const following: string[] = data?.following ?? [];
  const followers: string[] = data?.followers ?? [];

  const followersCount = followers.length;
  const followingCount = following.length;

  /** MEMBERS STATE */
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

const followingUsers = useMemo(() => {
  return members.filter((m) => following.includes(m.clerkId));
}, [members, following]);

const followerUsers = useMemo(() => {
  return members.filter((m) => followers.includes(m.clerkId));
}, [members, followers]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(BASE_URL, {
        params: {
          clerkId: user?.id,
          includeSelf: true,
        },
      });

      setMembers(res.data.users || []);
    } catch (err) {
      console.error(err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /** FOLLOW / UNFOLLOW */
const handleFollow = async (targetClerkId: string) => {
  if (!user?.id) return;

  const isFollowing = following.includes(targetClerkId);
  const action = isFollowing ? "unfollow" : "follow";

  const optimisticFollowing = isFollowing
    ? following.filter((id) => id !== targetClerkId)
    : [...following, targetClerkId];

  // ✅ instant UI update
  mutate(
    {
      ...data,
      following: optimisticFollowing,
    },
    false,
  );

  try {
    await fetch(
      `${BASE_URL}/${user.id}/follow-action/${targetClerkId}?action=${action}`,
      { method: "POST" },
    );

    // ✅ sync with backend AFTER success
    mutate();
  } catch (err) {
    console.error(err);

    // ❌ revert on failure
    mutate();
  }
};

  useEffect(() => {
    if (!user?.id) return;
    fetchUsers();
  }, [user?.id, fetchUsers]);

  return (
    <FollowCtx.Provider
      value={{
        following,
        followers,
        followersCount,
        followingCount,
        followingUsers,
        followerUsers,
        handleFollow,
        loading,
        error,
        members,
      }}
    >
      {children}
    </FollowCtx.Provider>
  );
};

/** =========================
 * Hook
 * ========================= */
export const useFollowContext = () => {
  const context = useContext(FollowCtx);

  if (!context) {
    throw new Error("useFollowContext must be used within FollowProvider");
  }

  return context;
};