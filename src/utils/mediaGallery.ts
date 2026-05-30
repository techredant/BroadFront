import { formatNickHandle } from "@/utils/nickName";
import { isVideoMedia } from "@/utils/mediaUtils";

export type MediaGalleryItem = {
  id: string;
  uri: string;
  postId: string;
  nickname: string;
  isVideo: boolean;
  mediaIndex: number;
};

type MediaPost = {
  _id: string;
  media?: string[];
  user?: { nickName?: string; nickname?: string };
};

function postNickname(post: MediaPost): string {
  const nick = post.user?.nickName ?? post.user?.nickname;
  return formatNickHandle(nick) || "@Anonymous";
}

export function flattenPostsToMediaItems(posts: MediaPost[]): MediaGalleryItem[] {
  const items: MediaGalleryItem[] = [];

  for (const post of posts) {
    const media = post.media ?? [];
    if (!media.length) continue;

    const nickname = postNickname(post);
    media.forEach((uri, index) => {
      items.push({
        id: `${post._id}-${index}`,
        uri,
        postId: post._id,
        nickname,
        isVideo: isVideoMedia(uri),
        mediaIndex: index,
      });
    });
  }

  return items;
}

export function splitMediaGalleryItems(items: MediaGalleryItem[]) {
  return {
    videos: items.filter((item) => item.isVideo),
    images: items.filter((item) => !item.isVideo),
  };
}
