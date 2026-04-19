import { useUser } from "@clerk/clerk-expo";
import { AvatarWithStatus } from "./AvatarsWithStatus";
import { useLevel } from "@/context/LevelContext";

export function CreateStatus() {
  const { user } = useUser();
  const { userDetails } = useLevel();

  return (
    <AvatarWithStatus
      imageUrl={userDetails?.image || user?.imageUrl }
      hasStatus={userDetails?.hasActiveStatus}
    />
  );
}
