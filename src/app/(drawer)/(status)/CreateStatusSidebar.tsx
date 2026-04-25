import { useUser } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import { AvatarInputStatus } from "./AvatarInputStatus";

export function CreateStatusSidebar() {
  const { user } = useUser();
  const { userDetails } = useLevel();

  return (
    <AvatarInputStatus
      imageUrl={userDetails?.image || user?.imageUrl }
      hasStatus={userDetails?.hasActiveStatus}
    />
  );
}
