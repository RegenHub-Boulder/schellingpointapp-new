# Aesthetic Package for Schelling Point MVP

This package contains everything needed to apply the original app's visual design to the MVP.

## Contents

```
aesthetic-package/
├── README.md                      # This file
├── AESTHETIC_SPEC.md              # Detailed design specification
├── reference-globals.css          # Original globals.css (copy relevant sections)
├── reference-tailwind.config.ts   # Original tailwind config (copy relevant sections)
└── fonts/
    ├── BDOGrotesk-Regular.otf     # Font weight 400
    ├── BDOGrotesk-DemiBold.otf    # Font weight 600
    ├── BDOGrotesk-Bold.otf        # Font weight 700
    └── BDOGrotesk-ExtraBold.otf   # Font weight 800
```

## Quick Start

### 1. Copy Fonts
```bash
cp -r fonts/ <mvp-project>/public/fonts/
```

### 2. Update globals.css
Add the font-face declarations and CSS custom properties from `reference-globals.css` or follow the spec in `AESTHETIC_SPEC.md`.

Key sections to add:
- `@font-face` declarations for BDO Grotesk (4 weights)
- CSS custom properties in `:root` (dark theme)
- CSS custom properties in `.light` class
- `.glass-card` class
- `.neon-glow` and `.neon-glow-sm` classes
- `.gradient-radial` class

### 3. Update tailwind.config.ts
Add from `reference-tailwind.config.ts`:
- `fontFamily.display` for BDO Grotesk
- All custom `keyframes` (gradient-drift, pulse-neon, etc.)
- All custom `animation` timings

### 4. Ensure Dark Mode Default
The app should default to dark mode on load. Check theme initialization.

## Key Visual Elements

| Element | Value |
|---------|-------|
| Primary Color | `#B2FF00` (neon lime) |
| Border Radius | `0.75rem` (12px) |
| Display Font | BDO Grotesk |
| Body Font | Inter (system) |
| Default Theme | Dark |

## Reference

See `AESTHETIC_SPEC.md` for the complete detailed specification including:
- All color values (HSL format)
- Component styling patterns
- Animation definitions
- Special effects (glassmorphism, neon glow, animated gradients)
