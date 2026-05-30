import axios from "axios";
import { API_PUBLIC_URL } from "@/constants/api";

export async function fetchRemovedPostIds(ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids.map((id) => String(id)).filter(Boolean))];
  if (!unique.length) return [];

  try {
    const res = await axios.post<{ removedIds?: string[] }>(
      `${API_PUBLIC_URL}/api/posts/visible`,
      { ids: unique },
    );
    return Array.isArray(res.data?.removedIds)
      ? res.data.removedIds.map((id) => String(id))
      : [];
  } catch {
    return [];
  }
}

export function filterRemovedPosts<T extends { _id?: string }>(
  posts: T[],
  removedIds: string[],
): T[] {
  if (!removedIds.length) return posts;
  const removed = new Set(removedIds.map((id) => String(id)));
  return posts.filter((post) => !removed.has(String(post?._id ?? "")));
}
