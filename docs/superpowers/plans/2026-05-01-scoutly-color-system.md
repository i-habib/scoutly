# Scoutly Unified Color System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 848 Tailwind color class occurrences across 17 files from chaotic slate/gray/emerald/sky/indigo/violet/cyan to a unified warm stone+amber system.

**Architecture:** Pure class-name migration using find-and-replace with AST-aware verification. No new files created. No Tailwind config changes. Order matters: global colors first, then special cases, then radius fixes, then rank colors.

**Tech Stack:** Tailwind CSS, React/TSX, grep, sed

---

## File Structure

All changes are modifications to existing files. No new files created.

**Files to modify (17 total):**
- `src/routes/timeline.tsx` — Rank colors (line ~460), timeline UI
- `src/routes/profile.tsx` — Rank colors (line ~638), profile UI
- `src/routes/profile\ 2.tsx` — Dark theme profile page
- `src/routes/landing.tsx` — Landing page
- `src/routes/onboarding.tsx` — Onboarding flow
- `src/routes/index.tsx` — Dashboard
- `src/routes/ai-coach.tsx` — AI coach chat
- `src/routes/events.tsx` — Events list
- `src/routes/advancement.tsx` — Rank advancement
- `src/routes/merit-badges/index.tsx` — Merit badge list
- `src/routes/merit-badges/\$badgeId.tsx` — Merit badge detail
- `src/routes/login.tsx` — Login page
- `src/components/Header.tsx` — Navigation header
- `src/components/RankAdvancement.tsx` — Rank component
- `src/components/Toast.tsx` — Toast notifications
- `src/components/ErrorBoundary.tsx` — Error boundary
- `src/components/SkeletonLoader.tsx` — Skeleton loader

---

### Task 1: Global Color Migration — Slate → Stone

**Files:** All 17 files listed above

**Strategy:** Batch replace all `slate-*` color classes with `stone-*` equivalents.

- [ ] **Step 1: Run batch replacement for slate colors**

```bash
# From repo root
cd /Users/admin/Documents/Github\ Repos/Scoutly

# Replace all slate color classes with stone
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i '' \
  -e 's/slate-900/stone-900/g' \
  -e 's/slate-800/stone-800/g' \
  -e 's/slate-700/stone-700/g' \
  -e 's/slate-600/stone-600/g' \
  -e 's/slate-500/stone-500/g' \
  -e 's/slate-400/stone-400/g' \
  -e 's/slate-300/stone-300/g' \
  -e 's/slate-200/stone-200/g' \
  -e 's/slate-100/stone-100/g' \
  -e 's/slate-50/stone-50/g' \
  {} +
```

- [ ] **Step 2: Verify zero slate occurrences remain**

```bash
grep -r "slate-" src/ --include="*.tsx" --include="*.ts" --include="*.css" || echo "No slate classes found"
```

Expected: "No slate classes found" or empty output.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: migrate slate colors to stone palette

- Replace all slate-* Tailwind classes with stone-* equivalents
- 17 files affected, ~400+ class replacements
- Part of unified warm color system migration"
```

---

### Task 2: Global Color Migration — Gray → Stone

**Files:** All 17 files listed above

- [ ] **Step 1: Run batch replacement for gray colors**

```bash
cd /Users/admin/Documents/Github\ Repos/Scoutly

find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i '' \
  -e 's/gray-900/stone-900/g' \
  -e 's/gray-800/stone-800/g' \
  -e 's/gray-700/stone-700/g' \
  -e 's/gray-600/stone-600/g' \
  -e 's/gray-500/stone-500/g' \
  -e 's/gray-400/stone-400/g' \
  -e 's/gray-300/stone-300/g' \
  -e 's/gray-200/stone-200/g' \
  -e 's/gray-100/stone-100/g' \
  -e 's/gray-50/stone-50/g' \
  {} +
```

- [ ] **Step 2: Verify zero gray color occurrences remain**

```bash
grep -r "gray-" src/ --include="*.tsx" --include="*.ts" --include="*.css" || echo "No gray classes found"
```

Expected: "No gray classes found" or empty output.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: migrate gray colors to stone palette

- Replace all gray-* Tailwind classes with stone-* equivalents
- Eliminates cold gray tones in favor of warm stone
- Part of unified warm color system migration"
```

---

### Task 3: Special Color Migrations

**Files:** Targeted files based on grep results

- [ ] **Step 1: Replace sky colors (links, accents)**

```bash
cd /Users/admin/Documents/Github\ Repos/Scoutly

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/sky-900/amber-800/g' \
  -e 's/sky-800/amber-700/g' \
  -e 's/sky-700/amber-700/g' \
  -e 's/sky-600/amber-600/g' \
  -e 's/sky-500/amber-500/g' \
  -e 's/sky-400/amber-500/g' \
  -e 's/sky-300/amber-400/g' \
  -e 's/sky-200/amber-300/g' \
  -e 's/sky-100/amber-200/g' \
  -e 's/sky-50/amber-100/g' \
  {} +
```

- [ ] **Step 2: Replace emerald colors (progress, success)**

```bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/emerald-900/amber-800/g' \
  -e 's/emerald-800/amber-700/g' \
  -e 's/emerald-700/amber-700/g' \
  -e 's/emerald-600/amber-600/g' \
  -e 's/emerald-500/amber-500/g' \
  -e 's/emerald-400/amber-500/g' \
  -e 's/emerald-300/amber-400/g' \
  -e 's/emerald-200/amber-300/g' \
  -e 's/emerald-100/amber-200/g' \
  -e 's/emerald-50/amber-100/g' \
  {} +
```

- [ ] **Step 3: Replace indigo colors**

```bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/indigo-900/amber-800/g' \
  -e 's/indigo-800/amber-700/g' \
  -e 's/indigo-700/amber-700/g' \
  -e 's/indigo-600/amber-600/g' \
  -e 's/indigo-500/amber-500/g' \
  -e 's/indigo-400/amber-500/g' \
  -e 's/indigo-300/amber-400/g' \
  -e 's/indigo-200/amber-300/g' \
  -e 's/indigo-100/amber-200/g' \
  -e 's/indigo-50/amber-100/g' \
  {} +
```

- [ ] **Step 4: Replace violet colors**

```bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/violet-900/amber-800/g' \
  -e 's/violet-800/amber-700/g' \
  -e 's/violet-700/amber-700/g' \
  -e 's/violet-600/amber-600/g' \
  -e 's/violet-500/amber-500/g' \
  -e 's/violet-400/amber-500/g' \
  -e 's/violet-300/amber-400/g' \
  -e 's/violet-200/amber-300/g' \
  -e 's/violet-100/amber-200/g' \
  -e 's/violet-50/amber-100/g' \
  {} +
```

- [ ] **Step 5: Replace cyan colors**

```bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/cyan-900/amber-800/g' \
  -e 's/cyan-800/amber-700/g' \
  -e 's/cyan-700/amber-700/g' \
  -e 's/cyan-600/amber-600/g' \
  -e 's/cyan-500/amber-500/g' \
  -e 's/cyan-400/amber-500/g' \
  -e 's/cyan-300/amber-400/g' \
  -e 's/cyan-200/amber-300/g' \
  -e 's/cyan-100/amber-200/g' \
  -e 's/cyan-50/amber-100/g' \
  {} +
```

- [ ] **Step 6: Verify special colors are gone**

```bash
for color in sky emerald indigo violet cyan; do
  count=$(grep -r "${color}-" src/ --include="*.tsx" --include="*.ts" | wc -l)
  echo "${color}: ${count} occurrences"
done
```

Expected: All counts should be 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: migrate accent colors to amber palette

- Replace sky, emerald, indigo, violet, cyan with amber/stone
- Unifies all accent colors into warm amber family
- Part of unified warm color system migration"
```

---

### Task 4: Border Radius Standardization

**Files:** All files with arbitrary radius values

- [ ] **Step 1: Replace arbitrary radius values**

```bash
cd /Users/admin/Documents/Github\ Repos/Scoutly

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/rounded-\[1\.9rem\]/rounded-2xl/g' \
  -e 's/rounded-\[1\.8rem\]/rounded-2xl/g' \
  -e 's/rounded-\[1\.5rem\]/rounded-2xl/g' \
  -e 's/rounded-\[1\.45rem\]/rounded-2xl/g' \
  -e 's/rounded-\[1\.4rem\]/rounded-2xl/g' \
  -e 's/rounded-\[1\.25rem\]/rounded-xl/g' \
  {} +
```

- [ ] **Step 2: Verify no arbitrary radius values remain**

```bash
grep -r "rounded-\[" src/ --include="*.tsx" --include="*.ts" || echo "No arbitrary radius values found"
```

Expected: "No arbitrary radius values found" or empty output.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: standardize border radius values

- Replace all arbitrary rounded-[Xrem] values with standard tokens
- rounded-[1.9rem] → rounded-2xl, rounded-[1.25rem] → rounded-xl
- Creates consistent radius scale across all components"
```

---

### Task 5: Rank Color Progression Update

**Files:**
- `src/routes/timeline.tsx`
- `src/routes/profile.tsx`

- [ ] **Step 1: Update rank colors in timeline.tsx**

Open `src/routes/timeline.tsx` and locate the `rankColors` object (around line 460). Replace with:

```typescript
const rankColors: Record<string, string> = {
  'Scout': 'text-stone-700 border-stone-200 bg-stone-100',
  'Tenderfoot': 'text-stone-800 border-stone-300 bg-stone-200',
  'Second Class': 'text-amber-900 border-amber-200 bg-amber-100',
  'First Class': 'text-amber-800 border-amber-300 bg-amber-100',
  'Star': 'text-amber-800 border-amber-200 bg-amber-50',
  'Life': 'text-amber-700 border-amber-300 bg-amber-50',
  'Eagle': 'text-amber-700 border-amber-400 bg-amber-50 font-bold',
};
```

- [ ] **Step 2: Update rank colors in profile.tsx**

Open `src/routes/profile.tsx` and locate the rank color mapping (around line 638). Replace with:

```typescript
const rankColorMap: Record<string, string> = {
  emerald: 'border-stone-200 bg-stone-100 text-stone-700',
  sky: 'border-stone-200 bg-stone-100 text-stone-700',
  slate: 'border-stone-200 bg-stone-100 text-stone-700',
};
```

If the profile page has rank-specific color logic beyond this map, update it to use the 7-color progression from the design spec.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: implement warm rank color progression

- Scout→Tenderfoot: stone foundation tones
- Second Class→First Class: amber-brown warmth
- Star→Life→Eagle: brightening amber to gold
- Replaces previous random color assignment"
```

---

### Task 6: Green Preservation Check

**Files:** All modified files

- [ ] **Step 1: Verify green is preserved where semantically appropriate**

```bash
grep -r "green-" src/ --include="*.tsx" --include="*.ts"
```

Expected: Only campout-related event type colors should remain (e.g., `bg-green-100 border-green-200 text-green-800` in event type definitions). If other green classes were accidentally introduced by earlier sed commands, revert them.

- [ ] **Step 2: Fix any accidental green replacements**

If green was accidentally changed to amber in non-campout contexts, manually revert those specific occurrences. Campout event badges should keep green.

---

### Task 7: Build Verification

**Files:** Entire project

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/admin/Documents/Github\ Repos/Scoutly
pnpm tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 2: Run build**

```bash
pnpm build
```

Expected: Build completes successfully with no errors.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Final verification grep**

```bash
echo "=== Checking for forbidden colors ==="
for color in slate gray sky emerald indigo violet cyan; do
  count=$(grep -r "${color}-" src/ --include="*.tsx" --include="*.ts" | wc -l)
  echo "${color}: ${count} occurrences"
done

echo "=== Checking for arbitrary radius ==="
grep -r "rounded-\[" src/ --include="*.tsx" --include="*.ts" | wc -l

echo "=== Checking stone usage ==="
grep -r "stone-" src/ --include="*.tsx" --include="*.ts" | wc -l
```

Expected:
- slate: 0
- gray: 0  
- sky: 0
- emerald: 0
- indigo: 0
- violet: 0
- cyan: 0
- rounded-[: 0
- stone-: >400 (confirming migration worked)

- [ ] **Step 5: Commit if all checks pass**

```bash
git add -A
git commit -m "refactor: complete unified warm color system migration

- All slate/gray colors migrated to warm stone palette
- All accent colors (sky, emerald, indigo, violet, cyan) migrated to amber
- Border radius standardized to Tailwind tokens
- Rank colors follow cohesive Scout→Eagle progression
- Build passes, tests pass"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** All sections A-G from design spec are addressed
  - A (Rank Progression): Task 5
  - B (Surfaces): Task 1-2 (slate/gray → stone)
  - C (Text): Task 1-2 (slate/gray → stone)
  - D (Borders): Task 1-2 (slate/gray → stone)
  - E (Buttons): Task 1-2 (slate/gray → stone)
  - F (Radius): Task 4
  - G (Event Types): Task 3 + Task 6 (preserve green for campout)
- [ ] **Placeholder scan:** No TBD, TODO, or vague steps
- [ ] **Type consistency:** N/A — no new types, pure class migration
- [ ] **Order matters:** Global colors first, then specials, then radius, then rank colors

---

## Rollback Plan

If issues arise:
1. `git log` to find commits
2. `git revert HEAD~N..HEAD` to roll back all migration commits
3. Re-run from the failing task
