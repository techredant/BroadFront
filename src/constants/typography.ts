import type { TextStyle } from "react-native";

/** Inter — closest widely available match to X (Twitter) Chirp. */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
} as const;

export type AppFontWeight = TextStyle["fontWeight"];

/** Map React Native fontWeight to the correct Inter file (required on Android). */
export function fontForWeight(weight?: AppFontWeight): string {
  const w =
    weight === "normal" || weight == null
      ? "400"
      : weight === "bold"
        ? "700"
        : String(weight);

  const n = Number(w);
  if (Number.isNaN(n)) return fonts.regular;
  if (n >= 800) return fonts.extraBold;
  if (n >= 700) return fonts.bold;
  if (n >= 600) return fonts.semiBold;
  if (n >= 500) return fonts.medium;
  return fonts.regular;
}

/** X-style type scale (sizes in px). */
export const typeScale = {
  /** Post body, primary UI copy */
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  } satisfies TextStyle,
  /** Display names on posts */
  title: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  } satisfies TextStyle,
  /** @handles, timestamps, secondary labels */
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 16,
  } satisfies TextStyle,
  /** Tab bar / section headers */
  headline: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
  } satisfies TextStyle,
  /** Small chips, badges */
  caption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
  } satisfies TextStyle,
} as const;

export function withFont(style?: TextStyle | TextStyle[]): TextStyle {
  const flat = Array.isArray(style)
    ? Object.assign({}, ...style.map((s) => s ?? {}))
    : style ?? {};
  return {
    ...flat,
    fontFamily: fontForWeight(flat.fontWeight),
  };
}
