import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        glass: 'hsl(var(--glass))',
        'glass-border': 'hsl(var(--glass-border))',
        neon: 'hsl(var(--neon-glow))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['BDO Grotesk', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 20px hsl(var(--neon-glow) / 0.3)' },
          '50%': { boxShadow: '0 0 30px hsl(var(--neon-glow) / 0.5)' },
        },
        'gradient-drift': {
          '0%': { transform: 'translateX(-50%) translateY(0%) scale(1) rotate(0deg)' },
          '25%': { transform: 'translateX(-35%) translateY(-15%) scale(1.15) rotate(3deg)' },
          '50%': { transform: 'translateX(-55%) translateY(10%) scale(0.9) rotate(-2deg)' },
          '75%': { transform: 'translateX(-45%) translateY(-5%) scale(1.1) rotate(1deg)' },
          '100%': { transform: 'translateX(-50%) translateY(0%) scale(1) rotate(0deg)' },
        },
        'gradient-drift-reverse': {
          '0%': { transform: 'translateX(0%) translateY(0%) scale(1) rotate(0deg)' },
          '20%': { transform: 'translateX(20%) translateY(-20%) scale(1.2) rotate(-5deg)' },
          '40%': { transform: 'translateX(-10%) translateY(15%) scale(0.85) rotate(3deg)' },
          '60%': { transform: 'translateX(15%) translateY(-10%) scale(1.1) rotate(-2deg)' },
          '80%': { transform: 'translateX(-5%) translateY(10%) scale(0.95) rotate(4deg)' },
          '100%': { transform: 'translateX(0%) translateY(0%) scale(1) rotate(0deg)' },
        },
        'gradient-drift-slow': {
          '0%': { transform: 'translateX(0%) translateY(0%) scale(1)' },
          '33%': { transform: 'translateX(-25%) translateY(-20%) scale(1.2)' },
          '66%': { transform: 'translateX(15%) translateY(10%) scale(0.9)' },
          '100%': { transform: 'translateX(0%) translateY(0%) scale(1)' },
        },
        'gradient-flow': {
          '0%': { transform: 'translateY(0%) rotate(0deg)', opacity: '0.3' },
          '50%': { transform: 'translateY(-30%) rotate(180deg)', opacity: '0.2' },
          '100%': { transform: 'translateY(0%) rotate(360deg)', opacity: '0.3' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'gradient-drift': 'gradient-drift 8s ease-in-out infinite',
        'gradient-drift-reverse': 'gradient-drift-reverse 10s ease-in-out infinite',
        'gradient-drift-slow': 'gradient-drift-slow 12s ease-in-out infinite',
        'gradient-flow': 'gradient-flow 15s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
