// types.ts
export interface Status {
  _id: string;
  userId: string;
  userName: string;
  media: string[];
  caption?: string;
  createdAt: string;
  type?: "image" | "video" | "text";
}
