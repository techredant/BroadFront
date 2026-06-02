import { useMemo } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import {
  resolveStatusProfileImage,
  type StatusProfileSnapshot,
} from "@/utils/statusProfileImage";

export function useStatusProfileImage(
  userId: string | undefined,
  snapshot?: StatusProfileSnapshot | null,
) {
  const { userDetails, posts } = useLevel();
  const { user } = useUser();

  return useMemo(
    () =>
      resolveStatusProfileImage(userId, snapshot, {
        selfUserId: user?.id,
        selfImage: userDetails?.image ?? user?.imageUrl ?? null,
        posts,
      }),
    [
      userId,
      snapshot?.image,
      snapshot?.firstName,
      snapshot?.companyName,
      user?.id,
      userDetails?.image,
      user?.imageUrl,
      posts,
    ],
  );
}
