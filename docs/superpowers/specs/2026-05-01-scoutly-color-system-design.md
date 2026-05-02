# Scoutly Unified Color System — Design Spec

## Overview

Replace the current chaotic mix of `slate`, `gray`, `stone`, `emerald`, `sky`, `indigo`, `violet`, `cyan`, and `amber` with a single, warm, professional design system built on Tailwind's `stone` and `amber` palettes. All surfaces, text, borders, and rank colors use warm tones. Cold slate/gray is eliminated.

**Scope:** This is a global class-name migration. No new dependencies. No custom Tailwind config required.

---

## A. Rank Color Progression

A cohesive warm journey from pale foundation stone to rich achievement gold.

| Rank | Color Family | Badge / Chip Classes |
|------|-------------|----------------------|
| **Scout** | Stone (foundation) | `bg-stone-100 border-stone-200 text-stone-700` |
| **Tenderfoot** | Stone (grounding) | `bg-stone-200 border-stone-300 text-stone-800` |
| **Second Class** | Amber begins (warmth) | `bg-amber-100 border-amber-200 text-amber-900` |
| **First Class** | Amber deepens (bronze) | `bg-amber-100 border-amber-300 text-amber-800` |
| **Star** | Amber brightens (copper) | `bg-amber-50 border-amber-200 text-amber-800` |
| **Life** | Amber richens (gold) | `bg-amber-50 border-amber-300 text-amber-700` |
| **Eagle** | Bright gold (pinnacle) | `bg-amber-50 border-amber-400 text-amber-700 font-bold` |

**Progression logic:** Scout→Tenderfoot stays in neutral stone (building the foundation). Second Class→First Class introduces deep amber-brown (gaining skill and warmth). Star→Life brightens through amber (rising achievement). Eagle gets the brightest gold treatment with a stronger border to signify the summit.

**Files to update:** `src/routes/timeline.tsx` (line ~460), `src/routes/profile.tsx` (line ~638), and any rank chip/badge components.

---

## B. Surface / Background System

All surfaces are warm-toned. No more cold `gray-50` or `slate-900`.

| Level | Tailwind Class | Usage |
|-------|---------------|-------|
| **Page background** | `bg-stone-50` | Base layer behind all content |
| **Card surface** | `bg-white` | Primary cards, modals, sections |
| **Elevated card** | `bg-white shadow-sm` | Cards that need subtle lift |
| **Subtle surface** | `bg-stone-100` | Alternating rows, badges, tags, inactive states |
| **Dark surface** | `bg-stone-900` | Dark-themed hero sections only (replaces `bg-slate-900`) |

---

## C. Text Color Hierarchy

Warm stone tones. No more `text-slate-600` or `text-gray-400`.

| Level | Tailwind Class | Usage |
|-------|---------------|-------|
| **Primary heading** | `text-stone-900` | H1, H2, card titles |
| **Secondary text** | `text-stone-700` | Body paragraphs, descriptions |
| **Muted / helper** | `text-stone-500` | Hints, captions, timestamps |
| **Disabled** | `text-stone-300` | Inactive inputs, disabled buttons |
| **Accent / link** | `text-amber-700` | Interactive links, hover states (replaces `text-sky-700`) |

---

## D. Border System

Warm, understated. Replaces all `border-gray-200` and `border-slate-200`.

| Context | Tailwind Class | Usage |
|---------|---------------|-------|
| **Default border** | `border-stone-200` | Cards, inputs, dividers |
| **Subtle border** | `border-stone-100` | Inner sections, subtle separators |
| **Emphasis border** | `border-stone-300` | Hover states, focused cards, active tabs |

---

## E. Button Specifications

Only two styles, ever.

### Primary (Dark)

```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
```

### Secondary (Light)

```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60">
```

**Specs for both:**
- Border-radius: `rounded-xl` (12px)
- Padding: `px-5 py-3`
- Font: `text-sm font-semibold`
- Transition: `transition-colors`
- Disabled: `disabled:cursor-not-allowed disabled:opacity-60`

**Rule:** No colored buttons except rank-themed badges/pills.

---

## F. Border Radius System

One consistent scale. Eliminate all `rounded-[1.9rem]`, `rounded-[1.45rem]`, `rounded-[1.25rem]`, etc.

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| **Small** | `rounded-lg` (8px) | Badges, tags, pills, small chips |
| **Medium** | `rounded-xl` (12px) | Buttons, inputs, nav items, small cards |
| **Large** | `rounded-2xl` (16px) | Primary cards, containers, modals |
| **Section** | `rounded-3xl` (24px) | Page sections, hero containers, onboarding panels |
| **Full** | `rounded-full` | Avatars, circular icons only |

---

## G. Event Type Colors

Muted tones that harmonize with the warm palette.

| Event Type | Classes |
|------------|---------|
| **Meeting** | `bg-stone-100 border-stone-200 text-stone-700` |
| **Campout** | `bg-green-100 border-green-200 text-green-800` |
| **Hike** | `bg-teal-100 border-teal-200 text-teal-800` |
| **Service** | `bg-amber-100 border-amber-200 text-amber-800` |

---

## Global Replacement Map

Apply these replacements across **all** source files (currently 848 matches in 17 files):

| From | To |
|------|-----|
| `slate-900` | `stone-900` |
| `slate-800` | `stone-800` |
| `slate-700` | `stone-700` |
| `slate-600` | `stone-600` |
| `slate-500` | `stone-500` |
| `slate-400` | `stone-400` |
| `slate-300` | `stone-300` |
| `slate-200` | `stone-200` |
| `slate-100` | `stone-100` |
| `slate-50` | `stone-50` |
| `gray-900` | `stone-900` |
| `gray-800` | `stone-800` |
| `gray-700` | `stone-700` |
| `gray-600` | `stone-600` |
| `gray-500` | `stone-500` |
| `gray-400` | `stone-400` |
| `gray-300` | `stone-300` |
| `gray-200` | `stone-200` |
| `gray-100` | `stone-100` |
| `gray-50` | `stone-50` |
| `bg-white` | `bg-white` (keep) |
| `text-white` | `text-white` (keep) |

**Special cases:**
- `text-sky-700` / `text-sky-600` → `text-amber-700` (link color)
- `text-emerald-600` / `text-emerald-700` → `text-amber-700` (merit badge progress)
- `text-green-400` → `text-amber-600` (AI coach markdown bold)
- `text-cyan-400` → `text-amber-500` (AI coach markdown italic)

---

## Border Radius Replacement Map

| From | To |
|------|-----|
| `rounded-[1.9rem]` | `rounded-2xl` or `rounded-3xl` (context-dependent) |
| `rounded-[1.8rem]` | `rounded-2xl` |
| `rounded-[1.5rem]` | `rounded-2xl` |
| `rounded-[1.45rem]` | `rounded-2xl` |
| `rounded-[1.4rem]` | `rounded-2xl` |
| `rounded-[1.25rem]` | `rounded-xl` |

---

## Implementation Notes

1. **Migration order:** Start with the global color replacements (slate/gray → stone), then handle special cases (sky/emerald/cyan → amber), then fix border-radius values, then update rank colors in timeline and profile.
2. **Verification:** After migration, grep for any remaining `slate-`, `gray-`, `sky-`, `emerald-`, `cyan-`, `indigo-`, `violet-` in `src/` to catch stragglers.
3. **No Tailwind config changes needed** — this system uses only built-in Tailwind classes.
4. **Dark mode:** Not in scope for this spec. If dark mode is added later, extend this system with `dark:` variants using `stone-900` backgrounds and `stone-100` text.

---

## Acceptance Criteria

- [ ] Zero occurrences of `slate-`, `gray-` (as color prefix), `sky-`, `indigo-`, `violet-`, `cyan-` in `src/` (except where semantically appropriate, e.g. `green` for campout)
- [ ] All rank badges use the 7-color progression defined in Section A
- [ ] All buttons use only the two styles in Section E
- [ ] No arbitrary radius values like `rounded-[1.9rem]` remain
- [ ] Every page feels visually consistent (warm stone base, amber accents, white cards)
- [ ] Build passes (`pnpm build` succeeds)
