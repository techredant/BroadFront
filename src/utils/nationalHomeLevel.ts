export type FeedLevel = {
  type: string;
  value: string;
};

/** National (home) feed level — matches LevelContext user bootstrap. */
export function getNationalHomeLevel(
  userDetails?: { home?: string } | null,
): FeedLevel {
  const value = userDetails?.home?.trim();
  if (value) {
    return { type: "home", value };
  }
  return { type: "home", value: "Home" };
}
