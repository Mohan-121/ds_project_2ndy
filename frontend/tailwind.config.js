/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F5F1',
        surface: '#FFFFFF',
        sunken: '#EFEDE7',
        ink: {
          DEFAULT: '#1B2328',
          secondary: '#5A656D',
          muted: '#8B959E',
        },
        border: {
          hairline: '#D9D6CC',
          dark: '#B8B4A6',
        },
        primary: {
          DEFAULT: '#17606E',
          hover: '#104C58',
          subtle: '#E8F1F3',
        },
        severity: {
          normal: '#2E7D53',
          'normal-bg': '#EAF5EF',
          watch: '#B7791F',
          'watch-bg': '#FCF6EC',
          high: '#C4511A',
          'high-bg': '#FDF1EB',
          critical: '#A3202F',
          'critical-bg': '#FBECEE',
        },
        domain: {
          traffic: '#3F5F7F',
          'traffic-subtle': '#EEF3F8',
          energy: '#9A7415',
          'energy-subtle': '#FAF5EB',
          env: '#2F7F6D',
          'env-subtle': '#EAF6F3',
          pop: '#7B5368',
          'pop-subtle': '#F7EFF3',
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Source Serif 4"', 'serif'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(27, 35, 40, 0.06)',
        dropdown: '0 4px 12px rgba(27, 35, 40, 0.08)',
      }
    },
  },
  plugins: [],
}
