import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f3faff",
        surface: "#f3faff",
        "surface-bright": "#f3faff",
        "surface-dim": "#c7dde9",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#e6f6ff",
        "surface-container": "#dbf1fe",
        "surface-container-high": "#d5ecf8",
        "surface-container-highest": "#cfe6f2",
        "surface-variant": "#cfe6f2",
        primary: "#001d44",
        "primary-container": "#00326b",
        secondary: "#48626e",
        "secondary-container": "#cbe7f5",
        tertiary: "#460003",
        "tertiary-fixed": "#ffdad6",
        "on-surface": "#071e27",
        "on-surface-variant": "#43474f",
        "on-primary": "#ffffff",
        "on-secondary-container": "#4e6874",
        outline: "#737780",
        "outline-variant": "#c3c6d1",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.375rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        ambient: "0 32px 64px -12px rgba(7, 30, 39, 0.06)",
      },
      fontFamily: {
        headline: ["'Segoe UI'", "Arial", "sans-serif"],
        body: ["'Segoe UI'", "Arial", "sans-serif"],
      },
      backgroundImage: {
        "institutional-gradient": "linear-gradient(135deg, #001d44 0%, #00326b 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
