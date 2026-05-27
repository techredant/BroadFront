import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { MediaViewerModal } from "@/components/posts/MediaViewModal";
import type { MediaViewerEngagement } from "@/components/posts/MediaViewModal";
import { resolveMediaUrls } from "@/utils/mediaUtils";

export type MediaViewerPost = {
  _id?: string;
  id?: string;
  media?: string[];
  [key: string]: any;
};

export type OpenMediaViewerOptions = {
  posts: MediaViewerPost[];
  postId?: string;
  post?: MediaViewerPost;
  media?: string[];
  mediaIndex?: number;
  engagement?: MediaViewerEngagement;
};

type MediaViewerContextValue = {
  openMediaViewer: (options: OpenMediaViewerOptions) => void;
  closeMediaViewer: () => void;
};

const MediaViewerContext = createContext<MediaViewerContextValue | null>(null);

function getPostId(post: MediaViewerPost | undefined, fallbackIndex: number) {
  return String(post?._id ?? post?.id ?? `post-${fallbackIndex}`);
}

function hasMedia(post: MediaViewerPost) {
  return Array.isArray(post.media) && post.media.length > 0;
}

export function MediaViewerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [posts, setPosts] = useState<MediaViewerPost[]>([]);
  const [postIndex, setPostIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [engagement, setEngagement] = useState<MediaViewerEngagement>();
  const [engagementPostId, setEngagementPostId] = useState<string>();
  const mediaIndexByPostId = useRef(new Map<string, number>());

  const closeMediaViewer = useCallback(() => {
    setVisible(false);
  }, []);

  const openMediaViewer = useCallback((options: OpenMediaViewerOptions) => {
    const incomingPosts =
      options.posts?.length > 0
        ? options.posts
        : options.post
          ? [options.post]
          : [{ _id: "standalone", media: options.media ?? [] }];

    const mediaPosts = incomingPosts.filter(hasMedia);
    const nextPosts = mediaPosts.length > 0 ? mediaPosts : incomingPosts;
    const requestedId =
      options.postId ??
      (options.post ? getPostId(options.post, 0) : undefined);
    const requestedIndex = requestedId
      ? nextPosts.findIndex((post, index) => getPostId(post, index) === requestedId)
      : 0;
    const nextPostIndex = Math.max(requestedIndex, 0);
    const nextPost = nextPosts[nextPostIndex];
    const postId = getPostId(nextPost, nextPostIndex);
    const maxMediaIndex = Math.max((nextPost?.media?.length ?? 1) - 1, 0);
    const nextMediaIndex = Math.min(options.mediaIndex ?? 0, maxMediaIndex);

    mediaIndexByPostId.current.set(postId, nextMediaIndex);
    setPosts(nextPosts);
    setPostIndex(nextPostIndex);
    setMediaIndex(nextMediaIndex);
    setEngagement(options.engagement);
    setEngagementPostId(options.engagement ? postId : undefined);
    setVisible(true);
  }, []);

  const handlePostChange = useCallback(
    (nextPostIndex: number, restoredMediaIndex: number) => {
      setPostIndex(nextPostIndex);
      setMediaIndex(restoredMediaIndex);
    },
    [],
  );

  const mediaList = useMemo(
    () => resolveMediaUrls(Array.isArray(posts[postIndex]?.media) ? posts[postIndex].media : []),
    [postIndex, posts],
  );

  const currentPostId = getPostId(posts[postIndex], postIndex);
  const currentEngagement =
    currentPostId === engagementPostId ? engagement : undefined;

  const value = useMemo(
    () => ({ openMediaViewer, closeMediaViewer }),
    [closeMediaViewer, openMediaViewer],
  );

  return (
    <MediaViewerContext.Provider value={value}>
      {children}
      <MediaViewerModal
        modalVisible={visible}
        setModalVisible={setVisible}
        mediaList={mediaList}
        selectedIndex={mediaIndex}
        post={posts[postIndex]}
        posts={posts}
        engagement={currentEngagement}
        totalPosts={posts.length}
        currentPostIndex={postIndex}
        mediaIndexByPostIdRef={mediaIndexByPostId}
        getPostId={(index) => getPostId(posts[index], index)}
        onPostChange={handlePostChange}
        onMediaIndexChange={setMediaIndex}
      />
    </MediaViewerContext.Provider>
  );
}

export function useMediaViewer() {
  const context = useContext(MediaViewerContext);
  if (!context) {
    throw new Error("useMediaViewer must be used within MediaViewerProvider");
  }
  return context;
}
