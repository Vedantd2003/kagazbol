# KagazBol Design Documentation

## Direction Evaluation

### Direction A: Saffron & Ink (not chosen)

A warm, earthy palette inspired by traditional Indian document design.

- Primary: Saffron orange (#F4A340)
- Background: Cream (#FAF6F0)
- Foreground: Deep ink (#1F2937)
- Accent: Forest green (#0F6E5E)

**Why not chosen:**
- Saffron on cream fails WCAG AA for small Devanagari text (contrast ratio ~2.8:1 for body copy).
- Orange primary with dark text needs careful application to avoid vibrancy fatigue on AMOLED displays.
- Noto Sans Devanagari renders better with cooler backgrounds (less yellow cast).
- Elderly users in user research found the warm background made dense Devanagari text harder to read.

### Direction B: Indigo & Mist (CHOSEN)

A calm, trustworthy palette that prioritises legibility for Devanagari script.

**Why chosen:**
- Indigo primary (#3730A3) on white: contrast ratio 8.6:1 — exceeds WCAG AA for all text sizes.
- Light mist background (#F8F7FF) avoids harsh glare on mobile screens in daylight.
- Excellent Noto Sans Devanagari rendering: the blue-shifted background reduces letterform blur.
- Accessible to elderly users: high contrast, generous 18px base font.
- Dark mode support: deep indigo (#1A1830) feels natural on AMOLED without pure black.
- Amber accent (#F59E0B) for amounts/deadlines: warm, attention-drawing, accessible.

## Color Palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | #F8F7FF | #1A1830 | Page background |
| `--foreground` | #1E1B4B | #F1F0FF | Body text |
| `--card` | #FFFFFF | #252342 | Card surfaces |
| `--primary` | #3730A3 | #818CF8 | Buttons, active states |
| `--primary-foreground` | #FFFFFF | #1A1830 | Text on primary |
| `--accent` | #F59E0B | #FBBF24 | Amounts, deadlines, highlights |
| `--muted` | #EEF2FF | #2E2A52 | Subtle backgrounds |
| `--muted-foreground` | #6B7280 | #9CA3AF | Hint text, labels |
| `--border` | #E0E7FF | #3D3870 | Dividers, card borders |
| `--warning` | #DC2626 | #F87171 | Overdue deadlines, errors |

## Typography

**Primary font:** Noto Sans (Latin, loaded via next/font/google)
- CSS variable: `--font-sans`
- Subsets: latin
- Display: swap

**Devanagari font:** Noto Sans Devanagari (loaded via next/font/google)
- CSS variable: `--font-devanagari`
- Subsets: devanagari
- Display: swap

**Font stack:** `var(--font-sans), var(--font-devanagari), system-ui, sans-serif`

**Base size:** 18px — optimised for mobile readability and elderly users.

**Devanagari scaling:** `:lang(hi), :lang(mr) { font-size: 1.05em }` — Devanagari letterforms
are denser than Latin, so 1.05× improves legibility without breaking layouts.

## Spacing System

Uses Tailwind CSS v4 defaults (4px base unit):
- Micro: 4px (gap-1), 8px (gap-2)
- Component padding: 16px (p-4), 24px (p-6)
- Card radius: 24px (rounded-3xl)
- Button radius: 12px (rounded-xl)
- Touch targets: minimum 64×64px (per WCAG 2.5.5)

## Accessibility

- All focus states: 3px solid primary outline, 2px offset, 4px radius
- Reduced motion: all animations disabled via `prefers-reduced-motion: reduce`
- Minimum contrast: 4.5:1 for normal text (WCAG AA), 3:1 for large text
- Devanagari text: 1.05× scale ensures adequate x-height
- Voice orb: minimum 64×64px, aria-label updates with state
- Screen reader: all decorative icons are aria-hidden
