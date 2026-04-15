export type Post = {
  [x: string]: string;
  id: string;
  level: string;
  author: {
    name: string;
    avatar?: string;
  };
  text: string;
  image?: string;
  likes: number;
  comments: number;
  reposts: number;
  views: number;
  createdAt: string;
};
