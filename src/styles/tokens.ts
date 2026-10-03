/**
 * Design system tokens for Gokul Vivaham | கோகுல் விவாஹம்
 * These tokens define the brand's visual identity, typography, spacings, and depth levels.
 */

export const colors = {
  primary: {
    DEFAULT: "#C8A95B", // Gold
    light: "#D9BC76",
    dark: "#A8883F",
  },
  secondary: {
    DEFAULT: "#6D1F1F", // Maroon
    light: "#8C3838",
    dark: "#521515",
  },
  sandal: {
    50: "#FAF7F2",
    100: "#EAD8B1",
    200: "#DFCB9E",
    300: "#D4BD8B",
    400: "#C9AE78",
    500: "#BCA066",
  },
  background: {
    light: "#FFFFFF",
    muted: "#FAF7F2",
    dark: "#111111",
  },
  text: {
    primary: "#1F1F1F",
    secondary: "#6B7280",
    muted: "#9CA3AF",
  },
  status: {
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
} as const;

export const spacing = {
  px: "1px",
  0: "0px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  9: "2.25rem",
  10: "2.5rem",
  11: "2.75rem",
  12: "3rem",
  14: "3.5rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  28: "7rem",
  32: "8rem",
  36: "9rem",
  40: "10rem",
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  gold: "0 4px 20px -2px rgba(200, 169, 91, 0.25)",
  maroon: "0 4px 20px -2px rgba(109, 31, 31, 0.25)",
} as const;

export const typography = {
  fontFamily: {
    sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
    serif: ["Playfair Display", "Georgia", "serif"],
    tamil: ["Noto Sans Tamil", "system-ui", "sans-serif"],
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
  },
} as const;
