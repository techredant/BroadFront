import { useUser } from "@clerk/clerk-expo";
import { AvatarWithStatus } from "./AvatarsWithStatus";
import { useLevel } from "@/context/LevelContext";

export function CreateStatus() {
  const { user } = useUser();
  const { userDetails } = useLevel();

  return (
    <AvatarWithStatus
      imageUrl={user?.imageUrl || userDetails?.image}
      hasStatus={userDetails?.hasActiveStatus}
    />
  );
}
