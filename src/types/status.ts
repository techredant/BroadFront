export type Status = {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  media?: string; // image or video
  text?: string;
  createdAt: string;
  viewed: boolean;
};
