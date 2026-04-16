import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import axios from "axios";

const BASE_URL = "https://cast-api-zeta.vercel.app/api/users";

interface User {
  id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  nickName: string;
  image: string;
  followers: string[];
  following?: string[];
  isFollowing?: boolean;
}

interface FollowContextType {
  currentUserId: string;
  members: User[];
  suggestions: User[];
  loading: boolean;
  suggestionsLoading: boolean;
  fetchUsers: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  toggleFollow: (user: User) => Promise<void>;
  loadingUserId: string | null;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const useUserContext = () => {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
};

interface Props {
  children: React.ReactNode;
  currentUserId: string;
}

export const UserProvider: React.FC<Props> = ({ children, currentUserId }) => {
  const [members, setMembers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  // ---------------- FETCH ALL USERS ----------------
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(BASE_URL, {
        params: { clerkId: currentUserId },
      });

      setMembers(res.data.users || []);
    } catch (err) {
      console.error(err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // ---------------- FOLLOW SUGGESTIONS (SMART LOGIC) ----------------
  const fetchSuggestions = useCallback(async () => {
    try {
      setSuggestionsLoading(true);

      const res = await axios.get(BASE_URL, {
        params: { clerkId: currentUserId },
      });

      const users = res.data.users || [];

      const filtered = users
        .filter((u: any) => u.clerkId !== currentUserId)
        .filter((u: any) => !u.isFollowing)
        .slice(0, 10);

      setSuggestions(filtered);
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [currentUserId]);

  // ---------------- FOLLOW / UNFOLLOW ----------------
const toggleFollow = async (user: User) => {
  const action = user.isFollowing ? "unfollow" : "follow";

  // 🔥 OPTIMISTIC UPDATE
  setMembers((prev) =>
    prev.map((u) =>
      u.clerkId === user.clerkId ? { ...u, isFollowing: !u.isFollowing } : u,
    ),
  );

  // optional: update suggestions too
  setSuggestions((prev) =>
    prev.map((u) =>
      u.clerkId === user.clerkId ? { ...u, isFollowing: !u.isFollowing } : u,
    ),
  );

  try {
    setLoadingUserId(user.clerkId);

    await axios.post(
      `${BASE_URL}/${currentUserId}/follow-action/${user.clerkId}?action=${action}`,
    );

    // ❌ NO refetch anymore
  } catch (err) {
    console.error(err);

    // 🔁 REVERT if API fails
    setMembers((prev) =>
      prev.map((u) =>
        u.clerkId === user.clerkId
          ? { ...u, isFollowing: user.isFollowing }
          : u,
      ),
    );

    setSuggestions((prev) =>
      prev.map((u) =>
        u.clerkId === user.clerkId
          ? { ...u, isFollowing: user.isFollowing }
          : u,
      ),
    );
  } finally {
    setLoadingUserId(null);
  }
};

  // ---------------- INITIAL LOAD ----------------
  useEffect(() => {
    if (!currentUserId) return;

    fetchUsers();
    fetchSuggestions();
  }, [currentUserId, fetchUsers, fetchSuggestions]);

  return (
    <FollowContext.Provider
      value={{
        currentUserId,
        members,
        suggestions,
        loading,
        suggestionsLoading,
        fetchUsers,
        fetchSuggestions,
        toggleFollow,
        loadingUserId,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};
