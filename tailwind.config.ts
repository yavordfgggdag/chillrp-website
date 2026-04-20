import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        /** TLR Design v2 — display / panel titles */
        heading: ['"Sofia Sans Extra Condensed"', "sans-serif"],
        /** UI body */
        body: ['Poppins', "sans-serif"],
        mono: ['ui-monospace', "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        /** Тъмно-зелен panel lift — brand emerald е `primary` / CSS `--accent` */
        accent: { DEFAULT: "hsl(var(--surface-accent))", foreground: "hsl(var(--surface-accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        neon: {
          white: "hsl(var(--neon-white))",
          /** @deprecated use `text-primary` — kept for old saved class strings */
          brand: "hsl(var(--primary))",
          /** Критично / изтриване (legacy име neon-red) */
          red: "hsl(var(--neon-red))",
          yellow: "hsl(var(--neon-yellow))",
          green: "hsl(var(--neon-green))",
          cyan: "hsl(var(--neon-cyan))",
        },
        server: {
          DEFAULT: "#10b981",
          dark: "#047857",
          light: "#6ee7b7",
        },
      },
      boxShadow: {
        /** Card / panel depth (Design v2) */
        card: "0 4px 4px rgba(0, 0, 0, 0.25)",
        "server-glow":
          "0 0 0 1px rgba(16, 185, 129, 0.35), 0 4px 4px rgba(0, 0, 0, 0.4), 0 0 32px rgba(4, 120, 87, 0.2), 0 0 48px rgba(16, 185, 129, 0.08)",
        "server-glow-sm": "0 0 20px rgba(16, 185, 129, 0.28), 0 0 28px rgba(4, 120, 87, 0.1), 0 4px 4px rgba(0, 0, 0, 0.35)",
      },
      borderRadius: {
        none: "0",
        sm: "max(0px, calc(var(--radius) - 2px))",
        md: "max(0px, calc(var(--radius) - 1px))",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 2px)",
        "2xl": "calc(var(--radius) + 4px)",
        "3xl": "calc(var(--radius) + 6px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Tailwind expects require for plugins in config
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
