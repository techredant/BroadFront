/** Civic / political visual language for BroadCast feed cards */
export const PoliticalPalette = {
  navy: "#1B3A6B",
  navyDark: "#0F2440",
  gold: "#C9A227",
  goldSoft: "rgba(201,162,39,0.22)",
  parchment: "#F4F0E6",
  parchmentDark: "#2A2824",
  crimson: "#B91C1C",
  support: "#E0245E",
  forest: "#0D7A4A",
};

export function getPoliticalColors(isDark: boolean) {
  return {
    stripe: PoliticalPalette.gold,
    stripeSecondary: PoliticalPalette.navy,
    cardBg: isDark ? "#0A0A0A" : "#FFFFFF",
    cardBorder: isDark ? "#2A2A2A" : "#E8E4DC",
    chipBg: isDark ? "rgba(201,162,39,0.12)" : "rgba(27,58,107,0.08)",
    chipText: isDark ? PoliticalPalette.gold : PoliticalPalette.navy,
    quoteBg: isDark ? PoliticalPalette.parchmentDark : PoliticalPalette.parchment,
    quoteBorder: PoliticalPalette.gold,
    mention: isDark ? "#6CB4EE" : PoliticalPalette.navy,
    actionBar: isDark ? "#141414" : "#F7F5F0",
    briefingLabel: PoliticalPalette.navy,
  };
}

export function formatConstituency(
  levelValue?: string,
  levelType?: string,
): string | null {
  if (!levelValue || levelValue.toLowerCase() === "home") return null;
  const type = levelType ? ` · ${levelType}` : "";
  return `${levelValue}${type}`;
}
