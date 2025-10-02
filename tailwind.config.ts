import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        klyra: {
          primary: "hsl(var(--klyra-primary))",
          "primary-600": "hsl(var(--klyra-primary-600))",
          accent: "hsl(var(--klyra-accent))",
          bg: "hsl(var(--klyra-bg))",
          "bg-elev": "hsl(var(--klyra-bg-elev))",
          surface: "hsl(var(--klyra-surface))",
          fg: "hsl(var(--klyra-fg))",
          muted: "hsl(var(--klyra-muted))",
          subtle: "hsl(var(--klyra-subtle))",
          border: "hsl(var(--klyra-border))",
          "border-subtle": "hsl(var(--klyra-border-subtle))",
          success: "hsl(var(--klyra-success))",
          warning: "hsl(var(--klyra-warning))",
          danger: "hsl(var(--klyra-danger))",
        },
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
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
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        radial: "radial-gradient(ellipse at center, rgba(124, 92, 255, 0.15) 0%, transparent 50%)",
        "grid-pattern": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
      },
      backgroundSize: {
        grid: "24px 24px",
      },
      boxShadow: {
        klyra: "var(--klyra-shadow)",
        "klyra-glow": "var(--klyra-shadow-glow)",
        "klyra-soft": "var(--klyra-shadow-soft)",
        card: "0 4px 20px -2px rgba(11, 15, 26, 0.4)",
        glow: "0 0 40px rgba(124, 92, 255, 0.3)",
        dropdown: "0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        dialog: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
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
      },
    },
  },
  plugins: [animate],
};

export default config;
