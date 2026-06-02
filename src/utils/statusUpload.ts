import axios from "axios";
import { API_PUBLIC_URL } from "@/constants/api";
import {
  applyOptimisticStatus,
  confirmOptimisticStatus,
  failOptimisticStatus,
} from "@/utils/statusList";

const MAX_RETRIES = 3;

type UploadPayload = {
  userId: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  nickName?: string;
  image?: string;
  caption?: string;
  media: string[];
  backgroundColor?: string;
};

export async function postStatusWithOptimistic(
  localMedia: { uri: string; type: "image" | "video" }[],
  profile: Omit<UploadPayload, "media">,
  uploadMedia: (items: { uri: string; type: "image" | "video" }[]) => Promise<string[]>,
) {
  const tempId = applyOptimisticStatus({
    userId: profile.userId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    companyName: profile.companyName,
    nickName: profile.nickName,
    image: profile.image,
    caption: profile.caption ?? "",
    media: localMedia.map((m) => m.uri),
    backgroundColor: profile.backgroundColor,
  });

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const uploaded =
        localMedia.length > 0 ? await uploadMedia(localMedia) : [];

      const res = await axios.post(`${API_PUBLIC_URL}/api/status`, {
        ...profile,
        media: uploaded,
      });

      confirmOptimisticStatus(tempId, res.data);
      return res.data;
    } catch (err) {
      attempt += 1;
      if (attempt >= MAX_RETRIES) {
        failOptimisticStatus(tempId);
        throw err;
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }

  failOptimisticStatus(tempId);
  throw new Error("Status upload failed");
}
