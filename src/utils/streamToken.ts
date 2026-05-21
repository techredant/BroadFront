const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://cast-api-zeta.vercel.app";

export type StreamUserPayload = {
  userId: string;
  name?: string;
  image?: string;
};

export async function fetchStreamToken(user: StreamUserPayload): Promise<string> {
  const res = await fetch(`${API_URL}/api/stream/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.userId,
      name: user.name,
      image: user.image,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data?.token) {
    throw new Error(data?.error ?? "Failed to fetch Stream token");
  }

  return data.token;
}
