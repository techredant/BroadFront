// import { Status } from "./types";

export type RootStackParamList = {
  PostScreen: { key: string };
  StatusInput: undefined;
  PostDetail: { post: Post };
  CommentsScreen: { post: any };
  Market: undefined;
  ProductDetail: { product: Product };
  NamesScreen: undefined;
  Location: undefined;
  EditProfile: undefined;
  // StatusView: { userStatuses: Status[] };
  Input: undefined;
  Notifications: undefined;
  GoLive: { userId: string; username: string };
  Privacy: undefined;
  AboutScreen: undefined;
  Sell: undefined;
  LevelScreen: undefined;
  Chat: { chatId: string; userName: string; userImg: string; userId: string };
  LiveStreamScreen: { userId: string; username: string };
  Drawer: undefined;
  ChatScreen: { channelId: string };
  VideoCallScreen: { roomName: string };
  ProfileScreen: { post: any };
};

export interface Post {
  _id: string;
  userId: string;
  userName: string;
  firstName?: string;
  nickname?: string;
  media: string[]; // ✅ media is an array
  caption?: string;
  likes?: any[];
  retweets?: string[];
  shares?: number;
  rcast?: number;
  createdAt: string;
  userImg: string;
  nickName?: string;
  originalPostId?: string;
  commentsCount?: number;
}

export type Product = {
  id: string;
  _id: string;
  name?: string;
  price: number;
  images: string[]; // ✅ fixed to be array
  title: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
  category: string;
};
