# Schelling Point Aesthetic Specification

This document describes the visual design system of the original Schelling Point app. Use this spec to make the MVP version look identical. **This is purely aesthetic - do not change any functionality.**

---

## Table of Contents
1. [Typography](#typography)
2. [Color System](#color-system)
3. [CSS Custom Properties](#css-custom-properties)
4. [Global Styles](#global-styles)
5. [Component Styling](#component-styling)
6. [Animations](#animations)
7. [Special Effects](#special-effects)

---

## Typography

### Font Family: BDO Grotesk

The app uses **BDO Grotesk** as its display font. Font files are located at `/public/fonts/`:

```
BDOGrotesk-Regular.otf    - weight: 400
BDOGrotesk-DemiBold.otf   - weight: 600
BDOGrotesk-Bold.otf       - weight: 700
BDOGrotesk-ExtraBold.otf  - weight: 800
```

### Font-Face Declarations (globals.css)

```css
@font-face {
  font-family: 'BDO Grotesk';
  src: url('/fonts/BDOGrotesk-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'BDO Grotesk';
  src: url('/fonts/BDOGrotesk-DemiBold.otf') format('opentype');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'BDO Grotesk';
  src: url('/fonts/BDOGrotesk-Bold.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'BDO Grotesk';
  src: url('/fonts/BDOGrotesk-ExtraBold.otf') format('opentype');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}
```

### Tailwind Font Configuration (tailwind.config.ts)

```typescript
fontFamily: {
  display: ['BDO Grotesk', 'system-ui', 'sans-serif'],
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
}
```

### Usage Pattern
- **`font-display`** - Headings, titles, large text (BDO Grotesk)
- **`font-sans`** - Body text, UI elements (Inter or system font)

Example: `<h1 className="font-display font-bold">Title</h1>`

---

## Color System

### Dark Theme (DEFAULT)

The app defaults to dark mode. This is critical - dark theme should be applied on load.

```css
:root {
  --background: 220 20% 6%;        /* #0d0f14 - Very dark blue-gray */
  --foreground: 210 20% 98%;       /* #f8f9fa - Off-white */

  --card: 220 15% 10%;             /* #16181d - Slightly lighter than bg */
  --card-foreground: 210 20% 98%;

  --popover: 220 15% 10%;
  --popover-foreground: 210 20% 98%;

  --primary: 78.1 100% 50%;        /* #B2FF00 - NEON LIME GREEN */
  --primary-foreground: 220 20% 6%;

  --secondary: 220 15% 15%;        /* #21252d */
  --secondary-foreground: 210 20% 98%;

  --muted: 220 15% 15%;
  --muted-foreground: 220 10% 60%;

  --accent: 220 15% 15%;
  --accent-foreground: 210 20% 98%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 210 20% 98%;

  --success: 142 76% 36%;
  --success-foreground: 210 20% 98%;

  --border: 220 15% 20%;
  --input: 220 15% 20%;
  --ring: 78.1 100% 50%;           /* Same neon lime as primary */

  /* Glass effect colors */
  --glass: 220 15% 12%;
  --glass-border: 220 15% 25%;
  --neon: 78.1 100% 50%;

  --radius: 0.75rem;               /* 12px border radius */
}
```

### Light Theme

```css
.light {
  --background: 40 23% 96%;        /* Warm cream/off-white */
  --foreground: 240 10% 10%;

  --card: 0 0% 100%;               /* Pure white */
  --card-foreground: 240 10% 10%;

  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 10%;

  --primary: 78.1 100% 45%;        /* Slightly darker lime for light mode */
  --primary-foreground: 240 10% 10%;

  --secondary: 40 15% 90%;
  --secondary-foreground: 240 10% 10%;

  --muted: 40 15% 90%;
  --muted-foreground: 240 10% 40%;

  --accent: 40 15% 90%;
  --accent-foreground: 240 10% 10%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 210 20% 98%;

  --success: 142 76% 36%;
  --success-foreground: 210 20% 98%;

  --border: 40 15% 85%;
  --input: 40 15% 85%;
  --ring: 78.1 100% 45%;

  --glass: 0 0% 100%;
  --glass-border: 40 15% 80%;
  --neon: 78.1 100% 45%;
}
```

### Key Color: Neon Lime (#B2FF00)

The signature color is **neon lime green** at `hsl(78.1, 100%, 50%)` which equals `#B2FF00`. This is used for:
- Primary buttons
- Active states
- Focus rings
- Neon glow effects
- Vote dots (filled state)
- Progress bar indicators

---

## CSS Custom Properties

### Base Layer Reset (globals.css)

```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-display;
  }
}
```

---

## Global Styles

### Body Styling
```css
body {
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Gradient Background
```css
.gradient-radial {
  background-image: radial-gradient(
    ellipse at 50% 0%,
    hsl(var(--primary) / 0.08) 0%,
    transparent 50%
  );
}
```

This creates a subtle radial gradient emanating from the top center with the neon lime color at 8% opacity.

---

## Component Styling

### Glassmorphism Card (.glass-card)

```css
.glass-card {
  background: hsl(var(--glass) / 0.6);
  border: 1px solid hsl(var(--glass-border) / 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

**Usage:** Cards, FAQ accordion items, CTA banners, modals

### Neon Glow Effects

```css
/* Large glow - for CTAs and prominent buttons */
.neon-glow {
  box-shadow:
    0 0 20px hsl(var(--neon) / 0.4),
    0 0 40px hsl(var(--neon) / 0.2),
    inset 0 0 10px hsl(var(--neon) / 0.1);
}

/* Small glow - for secondary buttons */
.neon-glow-sm {
  box-shadow:
    0 0 10px hsl(var(--neon) / 0.3),
    0 0 20px hsl(var(--neon) / 0.15);
}

/* Glow on hover for cards */
.glass-card:hover {
  border-color: hsl(var(--primary) / 0.3);
}
```

### Button Component

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-12 rounded-lg px-8',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
```

**Key interaction:** `active:scale-[0.98]` - slight scale down on click

### Card Component

```typescript
// Card - base container
const Card = React.forwardRef(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border bg-card text-card-foreground shadow-sm',
      interactive && 'cursor-pointer transition-all hover:shadow-md hover:border-primary/20',
      className
    )}
    {...props}
  />
))

// CardHeader
className={cn('flex flex-col space-y-1.5 p-6', className)}

// CardContent
className={cn('p-6 pt-0', className)}

// CardFooter
className={cn('flex items-center p-6 pt-0', className)}
```

### Session Card

Key styling patterns:
- `rounded-xl` for card container
- `rounded-lg` for inner elements (vote buttons, images)
- Host avatars: `h-8 w-8 rounded-full`
- Topic badges: `rounded-full` with `bg-secondary text-secondary-foreground`
- Vote button: `rounded-full` with primary colors

```tsx
// Vote button in session card
<button className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
  <ArrowUp className="h-4 w-4" />
</button>
```

### Badge Component

```typescript
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        outline: 'text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
      },
    },
  }
)
```

### Input/Textarea

```css
/* Common input styling */
rounded-md border border-input bg-background px-3 py-2 text-sm
ring-offset-background
placeholder:text-muted-foreground
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
transition-colors duration-200

/* Error state */
border-destructive focus-visible:ring-destructive
```

### Progress Bar (Credit Bar)

```tsx
// Indicator color based on percentage
indicatorClassName={cn(
  percentage < 20
    ? 'bg-destructive'
    : percentage < 50
    ? 'bg-amber-500'
    : 'bg-primary'
)}
```

### Vote Dots

Animated dots visualization using Framer Motion:
```tsx
// Filled dot (has vote)
'rounded-full bg-primary'

// Empty dot (no vote)
'rounded-full bg-muted'

// Sizes
sm: 'h-1.5 w-1.5'
default: 'h-2 w-2'
lg: 'h-2.5 w-2.5'

// Animation
initial={{ scale: 0 }}
animate={{ scale: 1 }}
transition={{ type: 'spring', stiffness: 500, damping: 30 }}
```

### Modal Overlay

```css
bg-black/50 backdrop-blur-sm
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
```

### Modal Content

```css
border bg-background p-6 shadow-lg rounded-xl
/* Animations */
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]
data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]
```

---

## Animations

### Tailwind Keyframes (tailwind.config.ts)

```typescript
keyframes: {
  'accordion-down': {
    from: { height: '0' },
    to: { height: 'var(--radix-accordion-content-height)' },
  },
  'accordion-up': {
    from: { height: 'var(--radix-accordion-content-height)' },
    to: { height: '0' },
  },
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  slideUp: {
    '0%': { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  'pulse-neon': {
    '0%, 100%': {
      boxShadow: '0 0 20px hsl(var(--neon) / 0.4), 0 0 40px hsl(var(--neon) / 0.2)',
    },
    '50%': {
      boxShadow: '0 0 30px hsl(var(--neon) / 0.6), 0 0 60px hsl(var(--neon) / 0.3)',
    },
  },
  'gradient-drift': {
    '0%': { transform: 'translate(0%, 0%)' },
    '50%': { transform: 'translate(-10%, 5%)' },
    '100%': { transform: 'translate(0%, 0%)' },
  },
  'gradient-drift-reverse': {
    '0%': { transform: 'translate(0%, 0%)' },
    '50%': { transform: 'translate(10%, -5%)' },
    '100%': { transform: 'translate(0%, 0%)' },
  },
  'gradient-drift-slow': {
    '0%': { transform: 'translate(0%, 0%)' },
    '50%': { transform: 'translate(-5%, 8%)' },
    '100%': { transform: 'translate(0%, 0%)' },
  },
  'gradient-flow': {
    '0%': { transform: 'translate(0%, 0%) scale(1)' },
    '33%': { transform: 'translate(5%, -5%) scale(1.05)' },
    '66%': { transform: 'translate(-5%, 5%) scale(0.95)' },
    '100%': { transform: 'translate(0%, 0%) scale(1)' },
  },
},
animation: {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out',
  'fade-in': 'fadeIn 0.5s ease-out',
  'slide-up': 'slideUp 0.5s ease-out',
  'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
  'gradient-drift': 'gradient-drift 15s ease-in-out infinite',
  'gradient-drift-reverse': 'gradient-drift-reverse 18s ease-in-out infinite',
  'gradient-drift-slow': 'gradient-drift-slow 25s ease-in-out infinite',
  'gradient-flow': 'gradient-flow 20s ease-in-out infinite',
},
```

### Slide Down Animation (for dropdowns/menus)

```css
.animate-slide-down {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Special Effects

### Animated Gradient Background (Hero Section)

The landing page hero has animated gradient blobs:

```tsx
// Primary neon green blob
<div
  className="absolute w-[900px] h-[900px] rounded-full blur-[120px] animate-gradient-drift"
  style={{
    background: 'radial-gradient(circle, hsl(78.1 100% 50% / 0.35) 0%, hsl(78.1 100% 50% / 0.15) 50%, transparent 70%)',
    top: '-40%',
    left: '50%',
  }}
/>

// Cyan/teal accent blob
<div
  className="absolute w-[700px] h-[700px] rounded-full blur-[100px] animate-gradient-drift-reverse"
  style={{
    background: 'radial-gradient(circle, hsl(170 80% 45% / 0.25) 0%, hsl(160 70% 40% / 0.1) 50%, transparent 70%)',
    top: '-20%',
    left: '10%',
  }}
/>

// Yellow/warm accent blob
<div
  className="absolute w-[600px] h-[600px] rounded-full blur-[90px] animate-gradient-drift-slow"
  style={{
    background: 'radial-gradient(circle, hsl(50 100% 50% / 0.25) 0%, hsl(40 100% 45% / 0.1) 50%, transparent 70%)',
    bottom: '-10%',
    right: '5%',
  }}
/>

// Orange/red warm glow
<div
  className="absolute w-[500px] h-[500px] rounded-full blur-[80px] animate-gradient-flow"
  style={{
    background: 'radial-gradient(circle, hsl(25 100% 50% / 0.2) 0%, hsl(0 80% 50% / 0.1) 50%, transparent 70%)',
    bottom: '0%',
    left: '30%',
  }}
/>
```

### Header Glassmorphism

```css
bg-white/20 dark:bg-black/30 backdrop-blur-xl border-b border-white/30 dark:border-white/10
```

### Giant Footer Text

```tsx
<h2 className="text-[15vw] sm:text-[12vw] lg:text-[10vw] font-display leading-none tracking-tighter text-muted-foreground/20 dark:text-muted-foreground/10 transition-colors duration-300 group-hover:text-muted-foreground/40 dark:group-hover:text-primary/70">
  <span className="font-bold">Eth</span>
  <span className="font-light">Boulder</span>
</h2>

/* Hover glow effect */
<div
  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 dark:group-hover:opacity-100"
  style={{
    background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.35), transparent 70%)',
    filter: 'blur(90px)',
    transform: 'scale(1.15)',
  }}
/>
```

### Theme Toggle Button

Fixed position floating button with glass effect:

```tsx
<button className={cn(
  'fixed z-[9999] w-12 h-12 rounded-full',
  'flex items-center justify-center',
  'glass-card border border-border/50 shadow-lg',
  'hover:scale-110 active:scale-95 transition-all duration-200',
  'hover:border-primary/50',
  // Desktop: bottom-left corner
  'md:bottom-6 md:left-6',
  // Mobile: above bottom nav, left side
  'bottom-24 left-4'
)}>
```

---

## Icon Library

Uses **Lucide React** for all icons. Import from `lucide-react`:

Common icons used:
- `ChevronRight`, `ChevronDown`, `ArrowRight`, `ArrowUp`
- `Menu`, `X` (close)
- `User`, `LogOut`, `Settings`, `Shield`
- `Vote`, `Users`, `CheckCircle2`, `Sparkles`
- `Lightbulb`, `Coins`, `TrendingUp`
- `Sun`, `Moon` (theme toggle)
- `Send`, `Youtube` (social icons)
- `Plus`, `Minus` (vote counter)

---

## Layout Patterns

### Container

```css
.container {
  @apply mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl;
}
```

### Stats Ribbon

```tsx
<section className="py-8 border-y border-border/50 bg-secondary/30">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
```

### Icon Container (Stats/How It Works)

```tsx
<div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary dark:bg-primary/10">
  <Icon className="h-6 w-6 text-primary-foreground dark:text-primary" />
</div>
```

### Section Spacing

- Small sections: `py-8`
- Medium sections: `py-16`
- Large sections: `py-16 sm:py-24`

---

## Dark Mode as Default

**CRITICAL:** The app defaults to dark mode. In the theme toggle:

```typescript
useEffect(() => {
  const root = document.documentElement
  // Default to dark if no class set
  if (!hasDarkClass && !hasLightClass) {
    root.classList.add('dark')
    setIsDark(true)
  }
}, [])
```

---

## Summary Checklist

To match the original design, ensure:

- [ ] BDO Grotesk font files copied to `/public/fonts/`
- [ ] Font-face declarations in globals.css
- [ ] All CSS custom properties for both light/dark themes
- [ ] Dark mode as default
- [ ] `glass-card` class with backdrop-filter
- [ ] `neon-glow` and `neon-glow-sm` classes
- [ ] `gradient-radial` background class
- [ ] All animation keyframes in tailwind.config.ts
- [ ] `active:scale-[0.98]` on buttons
- [ ] Proper border-radius (0.75rem / 12px base)
- [ ] Neon lime primary color (#B2FF00)
- [ ] Animated gradient blobs on hero
- [ ] Glassmorphism header
- [ ] Giant footer text with hover glow
- [ ] Floating theme toggle button
