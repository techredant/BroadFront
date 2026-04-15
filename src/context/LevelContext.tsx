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

interface Level {
  type: string;
  value: string;
}

interface LevelContextType {
  currentLevel: Level | null;
  setCurrentLevel: (level: Level) => void;

  posts: Post[];
  loadingPosts: boolean;

  userDetails: any;
  isLoadingUser: boolean;

  refreshUserDetails: () => Promise<void>;

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

  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  /* ---------------- FETCH USER ---------------- */

  const refreshUserDetails = useCallback(async () => {
    if (!user) return;

    setIsLoadingUser(true);

    try {
      const token = await getToken();

     const clerkId = user?.id;

     if (!clerkId) {
       console.log("⛔ No clerkId yet");
       return;
     }

     const res = await axios.get(`${BASE_URL}/api/users/${clerkId}`, {
       headers: {
         Authorization: `Bearer ${token}`,
       },
     });

      const data = res.data;

      setUserDetails(data);

      // Automatically set user level
      if (data?.home) {
        setCurrentLevel({ type: "home", value: data.home });
      } else if (data?.county) {
        setCurrentLevel({ type: "county", value: data.county });
      } else if (data?.constituency) {
        setCurrentLevel({ type: "constituency", value: data.constituency });
      } else {
        setCurrentLevel({ type: "ward", value: "ward" });
      }
    } catch (err) {
      console.error("❌ Error fetching user details", err);
    } finally {
      setIsLoadingUser(false);
    }
  }, [user]);

  /* ---------------- FETCH POSTS ---------------- */

  const fetchPosts = useCallback(async () => {
    if (!currentLevel) return;

    setLoadingPosts(true);

    try {
      const res = await axios.get<Post[]>(
        `${BASE_URL}/api/posts?levelType=${currentLevel.type}&levelValue=${currentLevel.value}`,
      );

      setPosts(res.data ?? []);
    } catch (err) {
      console.error("❌ Error fetching posts", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [currentLevel]);

  /* ---------------- LOAD USER ---------------- */

  useEffect(() => {
    if (!user) {
      setUserDetails(null);
      setCurrentLevel(null);
      return;
    }

    refreshUserDetails();
  }, [user]);

  /* ---------------- LOAD POSTS WHEN LEVEL CHANGES ---------------- */

  useEffect(() => {
    if (!currentLevel) return;

    fetchPosts();
  }, [currentLevel]);

  /* ---------------- SOCKET CONNECTION ---------------- */

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
        if (prev.find((p) => p._id === post._id)) return prev;
        return [post, ...prev];
      });
    });

    newSocket.on("deletePost", (postId: string) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    });

    return () => {
      newSocket.emit("leaveRoom", room);
      newSocket.disconnect();
    };
  }, [currentLevel]);

  return (
    <LevelContext.Provider
      value={{
        currentLevel,
        setCurrentLevel,

        posts,
        loadingPosts,

        userDetails,
        isLoadingUser,

        refreshUserDetails,

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

// import React, {
//   createContext,
//   useContext,
//   useEffect,
//   useRef,
//   useState,
//   useCallback,
// } from "react";

// import axios from "axios";
// import { useAuth, useUser } from "@clerk/clerk-expo";
// import io, { Socket } from "socket.io-client";

// import { Post } from "@/types/post";

// const BASE_URL = "https://cast-api-zeta.vercel.app";

// interface Level {
//   type: string;
//   value: string;
// }

// interface LevelContextType {
//   currentLevel: Level | null;
//   setCurrentLevel: (level: Level) => void;

//   posts: Post[];
//   loadingPosts: boolean;

//   userDetails: any;
//   isLoadingUser: boolean;

//   refreshUserDetails: () => Promise<void>;

//   socket: Socket | null;
// }

// const LevelContext = createContext<LevelContextType | undefined>(undefined);

// export const LevelProvider = ({ children }: { children: React.ReactNode }) => {
//   const { user } = useUser();
//   const { getToken } = useAuth();

//   const socketRef = useRef<Socket | null>(null);
//   const [socket, setSocket] = useState<Socket | null>(null);

//   const [currentLevel, setCurrentLevel] = useState<Level | null>({
//     type: "national",
//   });

//   const [posts, setPosts] = useState<Post[]>([]);
//   const [loadingPosts, setLoadingPosts] = useState(false);

//   const [userDetails, setUserDetails] = useState<any>(null);
//   const [isLoadingUser, setIsLoadingUser] = useState(false);

//   /* ---------------- FETCH USER ---------------- */

//   const refreshUserDetails = useCallback(async () => {
//     if (!user) return;

//     setIsLoadingUser(true);

//     try {
//       const token = await getToken();

//       const res = await axios.get(`${BASE_URL}/api/users/${user.id}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = res.data;
//       setUserDetails(data);

//       // 🔥 DO NOT override level — always stay on national initially
//       // User-specific levels can be used in UI later
//     } catch (err) {
//       console.error("❌ Error fetching user details", err);
//     } finally {
//       setIsLoadingUser(false);
//     }
//   }, [user]);

//   /* ---------------- FETCH POSTS ---------------- */

//   const fetchPosts = useCallback(async () => {
//     if (!currentLevel) return;

//     setLoadingPosts(true);

//     try {
//       const res = await axios.get<Post[]>(
//         `${BASE_URL}/api/posts?levelType=${currentLevel.type}&levelValue=${currentLevel.value}`,
//       );

//       setPosts(res.data ?? []);
//     } catch (err) {
//       console.error("❌ Error fetching posts", err);
//     } finally {
//       setLoadingPosts(false);
//     }
//   }, [currentLevel]);

//   /* ---------------- LOAD USER ---------------- */

//   useEffect(() => {
//     if (!user) {
//       setUserDetails(null);

//       // fallback to national even if user logs out
//       setCurrentLevel({
//         type: "national",
//         value: "kenya",
//       });

//       return;
//     }

//     refreshUserDetails();
//   }, [user]);

//   /* ---------------- LOAD POSTS WHEN LEVEL CHANGES ---------------- */

//   useEffect(() => {
//     if (!currentLevel) return;
//     fetchPosts();
//   }, [currentLevel]);

//   /* ---------------- SOCKET CONNECTION ---------------- */

//   useEffect(() => {
//     if (!currentLevel) return;

//     // cleanup old socket
//     socketRef.current?.disconnect();

//     const newSocket = io(BASE_URL, {
//       transports: ["websocket"],
//     });

//     socketRef.current = newSocket;
//     setSocket(newSocket);

//     const room = `level-${currentLevel.type}-${currentLevel.value}`;

//     newSocket.emit("joinRoom", room);

//     newSocket.on("newPost", (post: Post) => {
//       setPosts((prev) => {
//         if (prev.find((p) => p._id === post._id)) return prev;
//         return [post, ...prev];
//       });
//     });

//     newSocket.on("deletePost", (postId: string) => {
//       setPosts((prev) => prev.filter((p) => p._id !== postId));
//     });

//     return () => {
//       newSocket.emit("leaveRoom", room);
//       newSocket.disconnect();
//     };
//   }, [currentLevel]);

//   return (
//     <LevelContext.Provider
//       value={{
//         currentLevel,
//         setCurrentLevel,

//         posts,
//         loadingPosts,

//         userDetails,
//         isLoadingUser,

//         refreshUserDetails,

//         socket,
//       }}
//     >
//       {children}
//     </LevelContext.Provider>
//   );
// };

// export const useLevel = () => {
//   const context = useContext(LevelContext);

//   if (!context) {
//     throw new Error("useLevel must be used inside LevelProvider");
//   }

//   return context;
// };