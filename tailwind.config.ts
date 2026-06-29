import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#5e6ad2",
        "primary-hover": "#828fff",
        "primary-focus": "#5e69d1",
        ink: "#f7f8f8",
        "ink-muted": "#d0d6e0",
        "ink-subtle": "#8a8f98",
        "ink-tertiary": "#62666d",
        canvas: "#010102",
        "surface-1": "#0f1011",
        "surface-2": "#141516",
        "surface-3": "#18191a",
        "surface-4": "#191a1b",
        hairline: "#23252a",
        "hairline-strong": "#34343a",
        success: "#27a644",
      },
      fontFamily: {
        display: [
          "SF Pro Display",
          "Inter",
          "-apple-system",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        text: [
          "Inter",
          "-apple-system",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        xxl: "24px",
      },
      maxWidth: {
        content: "1280px",
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
