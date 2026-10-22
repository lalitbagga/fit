import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        // San Francisco on Apple devices, sensible fallbacks elsewhere
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "system-ui",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        // SF Pro Rounded for big numbers (streak, timers, weights)
        rounded: [
          "ui-rounded",
          '"SF Pro Rounded"',
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      // Apple's iOS Dynamic Type sizes (default "Large" setting)
      fontSize: {
        "large-title": ["34px", { lineHeight: "41px", letterSpacing: "0.37px", fontWeight: "700" }],
        title1: ["28px", { lineHeight: "34px", letterSpacing: "0.36px" }],
        title2: ["22px", { lineHeight: "28px", letterSpacing: "0.35px" }],
        title3: ["20px", { lineHeight: "25px", letterSpacing: "0.38px" }],
        headline: ["17px", { lineHeight: "22px", letterSpacing: "-0.41px", fontWeight: "600" }],
        body: ["17px", { lineHeight: "22px", letterSpacing: "-0.41px" }],
        callout: ["16px", { lineHeight: "21px", letterSpacing: "-0.32px" }],
        subhead: ["15px", { lineHeight: "20px", letterSpacing: "-0.24px" }],
        footnote: ["13px", { lineHeight: "18px", letterSpacing: "-0.08px" }],
        caption1: ["12px", { lineHeight: "16px", letterSpacing: "0px" }],
        caption2: ["11px", { lineHeight: "13px", letterSpacing: "0.07px" }],
      },
      colors: {
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        tertiary: "hsl(var(--tertiary-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        // iOS sheet spring approximation
        "sheet-up": "sheet-up 0.42s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
