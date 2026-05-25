export type PollLevelType =
  | "national"
  | "home"
  | "county"
  | "constituency"
  | "ward"
  | "organization";

export type PollOption = {
  _id: string;
  text: string;
  voteCount: number;
  percent: number;
};

export type PollCreator = {
  clerkId?: string;
  firstName?: string;
  lastName?: string;
  nickName?: string;
  companyName?: string;
  image?: string;
  isVerified?: boolean;
  verificationType?: string;
};

export type Poll = {
  _id: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  levelType: PollLevelType;
  levelValue: string;
  expiresAt: string;
  isAnonymous: boolean;
  verifiedOnly: boolean;
  liveCallId?: string | null;
  status: "active" | "closed";
  totalVotes: number;
  shareCount: number;
  commentCount: number;
  trendingScore?: number;
  creator?: PollCreator;
  createdAt: string;
  hasVoted?: boolean;
  myVoteOptionId?: string | null;
  analytics?: PollAnalytics;
};

export type PollComment = {
  _id: string;
  pollId: string;
  userId: string;
  text: string;
  user?: PollCreator;
  createdAt: string;
};

export type PollAnalytics = {
  byOption: Array<{ _id: string; votes: number }>;
  byHour: Array<{ _id: string; votes: number }>;
  byLevel: Array<{
    _id: { levelType: string; levelValue: string };
    votes: number;
  }>;
};

export type CreatePollPayload = {
  userId: string;
  question: string;
  options: string[];
  levelType: PollLevelType;
  levelValue: string;
  expiresAt: string;
  isAnonymous?: boolean;
  verifiedOnly?: boolean;
  liveCallId?: string;
};
