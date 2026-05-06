/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Shadcn-style semantic tokens plus a neutral zinc scale.
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        popover: 'hsl(var(--popover) / <alpha-value>)',
        'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        zinc: {
          50: 'hsl(var(--zinc-50) / <alpha-value>)',
          100: 'hsl(var(--zinc-100) / <alpha-value>)',
          200: 'hsl(var(--zinc-200) / <alpha-value>)',
          300: 'hsl(var(--zinc-300) / <alpha-value>)',
          400: 'hsl(var(--zinc-400) / <alpha-value>)',
          500: 'hsl(var(--zinc-500) / <alpha-value>)',
          600: 'hsl(var(--zinc-600) / <alpha-value>)',
          700: 'hsl(var(--zinc-700) / <alpha-value>)',
          800: 'hsl(var(--zinc-800) / <alpha-value>)',
          900: 'hsl(var(--zinc-900) / <alpha-value>)',
          950: 'hsl(var(--zinc-950) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
