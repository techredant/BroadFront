/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontSize: {
        xs: ["11px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["15px", { lineHeight: "22px" }],
        lg: ["17px", { lineHeight: "24px" }],
        xl: ["19px", { lineHeight: "26px" }],
        "2xl": ["23px", { lineHeight: "28px" }],
        "3xl": ["29px", { lineHeight: "32px" }],
        "4xl": ["35px", { lineHeight: "36px" }],
        "5xl": ["47px", { lineHeight: "1" }],
        "6xl": ["59px", { lineHeight: "1" }],
      },
      colors: {
        primary: "#6C5CE7",
        "primary-dark": "#5A4BD1",
        "primary-light": "#A29BFE",

        background: "#0F0E17",
        surface: "#1A1A2E",
        "surface-dark": "#0F0E17",
        "surface-light": "#16213E",

        foreground: "#FFFFFE",
        "foreground-muted": "#A7A9BE",
        "foreground-subtle": "#72757E",

        accent: "#FF6B6B",
        "accent-secondary": "#00B894",

        success: "#00B894",
        warning: "#FDCB6E",
        danger: "#FF6B6B",

        border: "#232946",
        "border-light": "#2E3354",
      },
    },
  },
  plugins: [],
};
