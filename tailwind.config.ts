import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          light: '#2d4a6f',
        },
        accent: '#3b82f6',
        success: '#22c55e',
        warning: '#eab308',
        danger: '#ef4444',
        background: '#f5f7fa',
        card: '#ffffff',
        text: {
          primary: '#1f2937',
          secondary: '#6b7280',
        },
        border: '#e5e7eb',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
