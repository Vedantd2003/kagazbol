# KagazBol Design Documentation — v2

## Direction A: "Aged Paper"

A warm, tactile palette drawn from the physical world of Indian documents — cream paper, deep ink, turmeric-gold highlights. The background `#FAF7F2` evokes the off-white of handmade paper; `#1E1440` reads as dark umber-indigo ink; `#D97706` is the unmistakable turmeric-amber of official seals and judicial stamps. Motion is slow and organic, modelled on paper unfolding rather than screen transitions. Typography pairs Rozha One (a display face with Devanagari capability and expressive curves) with Noto Sans Devanagari for body text, ensuring the full Hindi/Marathi character set is legible at small sizes.

| Token | Light value | Dark value | Contrast on bg (WCAG AA req 4.5:1) |
|---|---|---|---|
| `--foreground` | #1A1209 on #FAF7F2 | #F5EDD8 on #1A1209 | 18.6:1 / 16.2:1 — exceeds AAA |
| `--primary` | #1E1440 on #FAF7F2 | #F0C060 on #1A1209 | 14.9:1 / 9.8:1 — exceeds AAA |
| `--accent` | #D97706 on #FAF7F2 | #FBBF24 on #1A1209 | 3.7:1 — AA Large (use ≥18px only) |
| `--muted-foreground` | #7C6F63 on #FAF7F2 | #A8947A on #1A1209 | 4.6:1 / 4.5:1 — meets AA |
| `--warning` | #B91C1C on #FEF2F2 | #FCA5A5 on #7F1D1D | 6.9:1 / 4.9:1 — exceeds AA |

## Direction B: "Indigo Mist" (previous implementation)

A cool, trustworthy palette centred on indigo `#3730A3` and a near-white `#F8F7FF` background. Modern and legible, but somewhat generic; the cool cast can feel clinical for a document-assistant targeting users who are accustomed to physical paper. The blue palette also clashes with official Indian document palettes (typically ochre, burgundy, green ink).

| Token | Light value | Dark value | Contrast |
|---|---|---|---|
| `--foreground` | #1E1B4B on #F8F7FF | #F1F0FF on #1A1830 | 14.1:1 / 14.8:1 |
| `--primary` | #3730A3 on #F8F7FF | #818CF8 on #1A1830 | 8.6:1 / 5.2:1 |
| `--accent` | #F59E0B on #F8F7FF | #FBBF24 on #1A1830 | 2.9:1 — fails AA for small text |
| `--muted-foreground` | #6B7280 on #F8F7FF | #9CA3AF on #1A1830 | 4.3:1 — borderline |

## Chosen Direction: A — "Aged Paper"

Direction A is stronger for KagazBol's target users (first-time smartphone users, elderly rural residents, Hindi/Marathi speakers interacting with physical documents). The warm cream-and-ink palette:

1. **Metaphor match** — the product translates paper to voice; the design should feel like holding a document, not a dashboard.
2. **Distinctiveness** — the Indian EdTech/GovTech space is saturated with Indigo. A turmeric-amber accent is immediately recognisable and culturally resonant.
3. **Elderly legibility** — warm off-white reduces glare perceived on high-brightness mobile screens; the near-black `#1A1209` ink achieves 18.6:1 contrast far exceeding WCAG AAA.
4. **Devanagari rendering** — Rozha One provides expressive display headings while Noto Sans Devanagari handles body copy; the warm background reduces the blue-white halation that affects Devanagari matras on cooler palettes.
5. **Motion language** — slow, organic "paper unfolding" reveals feel calming and trustworthy to users who may be anxious about technology.

---

## Color Palette (Direction A)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | #FAF7F2 | #1A1209 | Page background |
| `--background-subtle` | #F0EBE1 | #221810 | Zebra rows, inset sections |
| `--foreground` | #1A1209 | #F5EDD8 | Body text |
| `--card` | #FFFFFF | #2A1E12 | Card surfaces |
| `--card-raised` | #F7F3ED | #321F0F | Elevated cards |
| `--primary` | #1E1440 | #F0C060 | Buttons, active states |
| `--primary-foreground` | #FAF7F2 | #1A1209 | Text on primary |
| `--accent` | #D97706 | #FBBF24 | Amounts, deadlines, highlights |
| `--accent-foreground` | #FFFFFF | #FFFFFF | Text on accent |
| `--muted` | #E8E0D4 | #3A2A1A | Subtle backgrounds |
| `--muted-foreground` | #7C6F63 | #A8947A | Hint text, labels |
| `--border` | #D4C9BB | #4A3520 | Dividers, card borders |
| `--border-subtle` | #EAE4DC | #3A2A1A | Subtle dividers |
| `--warning` | #B91C1C | #FCA5A5 | Errors, overdue |
| `--warning-bg` | #FEF2F2 | #7F1D1D | Error backgrounds |
| `--success` | #166534 | #166534 | Confirmations |
| `--success-bg` | #F0FDF4 | #14532D | Success backgrounds |

## Orb State Colours

| State | Colour | Meaning |
|---|---|---|
| idle | #D97706 (turmeric) | Waiting, breathing |
| listen | #2563EB (blue) | Recording voice |
| think | #7C3AED (violet) | Processing |
| speak | #16A34A (green) | Playing response |

## Typography

**Display:** Rozha One (Google Fonts) — expressive serifs, Devanagari-capable
- CSS variable: `--font-display`
- Weights: 400
- Subsets: latin, devanagari
- Usage: headings, app name, hero text

**Body:** Noto Sans (Latin) + Noto Sans Devanagari
- CSS variables: `--font-sans`, `--font-devanagari`
- Base size: 18px — optimised for mobile readability and elderly users
- Line height: 1.7 — generous for matras and ligatures

**Devanagari scaling:** `:lang(hi), :lang(mr) { font-size: 1.05em; line-height: 1.85 }` — Devanagari letterforms are denser; extra line-height prevents matra collision.

## Motion System

All motion values live in `src/lib/motion.ts`. No inline durations or easings in components.

| Tier | Behaviour | Trigger |
|---|---|---|
| full | All animations active | Default |
| lite | Fade only, no springs or transforms | Low memory / low cores + saveData |
| reduced | No animation | `prefers-reduced-motion` or calmMode toggle |

## Accessibility

- All focus states: 3px solid `--accent`, 3px offset, `--radius-sm` radius
- Reduced motion: all animations disabled via `prefers-reduced-motion: reduce`
- Minimum contrast: 4.5:1 for normal text (WCAG AA), 3:1 for large text
- Devanagari text: 1.05× scale + 1.85 line-height
- Minimum touch targets: 48px × 48px (WCAG 2.5.5, level AAA is 44px; we use 48px)
- Voice orb: aria-label updates with state; decorative icons are aria-hidden
