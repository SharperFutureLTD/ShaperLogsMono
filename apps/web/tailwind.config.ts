import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Responsive heading scales for mobile optimization
        'heading-xl': ['1.75rem', { lineHeight: '2rem' }],      // 28px mobile
        'heading-xl-md': ['2.25rem', { lineHeight: '2.5rem' }], // 36px desktop
        'heading-lg': ['1.5rem', { lineHeight: '2rem' }],       // 24px mobile
        'heading-lg-md': ['2rem', { lineHeight: '2.5rem' }],    // 32px desktop
        'heading-md': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px mobile
        'heading-md-md': ['1.5rem', { lineHeight: '2rem' }],    // 24px desktop
      },
      spacing: {
        'touch': '44px', // WCAG 2.1 AA minimum touch target
      },
      animationDelay: {
        '0': '0ms',
        '75': '75ms',
        '150': '150ms',
        '225': '225ms',
        '300': '300ms',
      },
      colors: {
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
        glow: {
          primary: "hsl(var(--glow-primary))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out": {
          from: {
            opacity: "1",
            transform: "translateY(0)",
          },
          to: {
            opacity: "0",
            transform: "translateY(10px)",
          },
        },
        "wave": {
          "0%, 100%": {
            transform: "scaleY(0.5)",
          },
          "50%": {
            transform: "scaleY(1)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "wave": "wave 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
