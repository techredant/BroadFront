import { useUser } from "@clerk/clerk-expo";
import { AvatarWithStatus } from "./AvatarsWithStatus";
import { useLevel } from "@/context/LevelContext";

export function CreateStatus() {
  const { user } = useUser();
  const { userDetails } = useLevel();

  return (
    <AvatarWithStatus
      hasStatus={!!userDetails?.hasActiveStatus}
      currentUserId={user?.id}
      statuses={userDetails?.myStatuses ?? []}
    />
  );
}
