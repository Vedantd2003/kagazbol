# KagazBol design system — "Stamp & Sheet"

The product's world is Indian paperwork, so the visual language is built from its materials rather
than from a SaaS template: government-form paper, blue-black ink, the violet of an office rubber
stamp, and a highlighter over the line that matters.

## Tokens (`src/app/globals.css`)

| Token | Light | Use |
|---|---|---|
| `paper` | `#e9eeea` | page ground (cool form-paper, not cream) |
| `sheet` | `#fbfcfa` | document and panel surfaces |
| `ink` / `ink-2` / `ink-3` | `#1d2433` / `#4a5468` / `#6b7486` | text |
| `rule` | `#c9d2cc` | hairlines |
| `stamp` | `#4636a6` | the single accent: primary actions, verification stamps |
| `mark` | `#f5d547` | highlighter: evidence and selection |
| `due` | `#b42318` | deadlines, warnings, "not found" |
| `ok` | `#1e6b4f` | completed steps, privacy |

Dark mode has its own values for every token (not an automatic inversion).

**Type.** Tiro Devanagari Marathi (display; Latin + Marathi-specific Devanagari forms, by Tiro
Typeworks) and Mukta (text; Indian-designed, Latin + Devanagari in one family). Self-hosted via
`@fontsource` — no runtime call to Google Fonts. 18 px base (20.5 px with "Larger text"), modular
scale, Devanagari gets extra line height.

**Shape.** Paper has 3 px corners, controls 10 px, panels 14 px — radius encodes "document" vs
"interface". Touch targets ≥ 44 px; primary actions 64 px.

**The one flourish.** The rubber stamp (`.stamp`): double ring, slight rotation, ink texture. It only
ever carries meaning — "Found in document", "Not found — check the original", verification of answers.

**Motion.** One orchestrated moment on the landing page (highlight sweep → stamp → explanation).
Everything else is a response to the user: drawers, evidence highlight sweep, recording pulse,
real progress. `prefers-reduced-motion` reduces all of it to instant state changes. Motion never
stands in for progress: processing steps tick only when the server confirms them.

## Accessibility

Keyboard-reachable everything, visible 3 px focus ring, skip link, native `<dialog>` for settings
(focus trap, Esc), radio-group language switch with native names, `aria-live` for processing steps,
mic status and answers, labelled sliders, text alternatives to every voice feature, and a text-only
mode. Colour is never the only signal: stamps have words, warnings have icons.

## Pages

- `/` — landing: live demo hero, how it works (a real 4-step sequence), checked answers, voice,
  language capability table generated from `src/lib/languages.ts`, privacy facts.
- `/app` — workspace: upload → quality check → real processing steps → split pane (document text with
  evidence highlights and select-to-explain | explanation + ask). Phones get three tabs.
- `/eval` — admin reliability dashboard.

The previous "Indigo & Mist" direction (v2) was replaced entirely.
