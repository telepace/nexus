---
trigger: model_decision
description: 
globs: 
---
## 🎨 Design System Guidelines (Tailwind v3 + shadcn/ui)

This document spells out **exactly how to author UI code** in this project. Treat it as a contract.

---

### 1 · Source of Truth

- **Tokens live in `globals.css` only**
    - `globals.css` – declarative CSS variables (`--primary`, `--radius`, etc.).maps those variables to Tailwind design‑tokens (colors, fonts, spacing…).
- **Do not redefine, shadow, or inline‑override** any values found there.
- Dark‑mode is controlled by the `.dark` class—respect it; no `prefers-color-scheme` hacks.

---

### 2 · Component Workflow

1. **Look before you code**
    - Scan `/components/ui/**` for an existing component that already does the job.
    - If it exists, **reuse**—extend only through props or composition.
1. **When creating a new component**
    - Export as a **named functional component** (`export function AlertDialog() { … }`).
    - Colocate tests and stories (`.test.tsx`, `.stories.tsx`).
    - Keep the public API minimal; expose only necessary props.

---

### 3 · Styling Rules

- **Utility‑first only** – Tailwind classes compose the UI. Absolutely **no `style={{…}}` props**.
- **No extra CSS files** – If something truly needs CSS, add it under the relevant `@layer` in `globals.css`.
- **No “magic numbers”** – use spacing scale (`p-4`, `gap-6`), radii (`rounded-lg`), etc.
- **Typography** – rely on `font-sans` / `font-mono` and `text-{xs…9xl}`. Never hard‑code `px` sizes.
- **Colors** – pick from the semantic palette (`bg-primary`, `text-muted-foreground`, `border-destructive`). Never call `oklch()` or `hsl()` directly in JSX.

**Use colors semantically:**  * `primary`: For main call-to-action buttons, important highlights.  * `secondary`: For less prominent actions or secondary information.  * `destructive`: For actions that lead to deletion or other potentially negative outcomes.  * `background`, `foreground`: For general page and text colors.  * `card`, `card-foreground`: For card-like container elements.  * `popover`, `popover-foreground`: For popover elements.  * `border`: For general borders.  * `input`: For input field borders/backgrounds.  * `ring`: For focus rings or similar emphasis.

- **Shadows & radius** – only the keys supplied in `boxShadow` / `borderRadius`.

---

### 4 · Accessibility & Semantics

- Write **semantic HTML** first (`<button>` not `<div onClick>`).
- Provide ARIA labels/roles where semantics alone are insufficient.
- Ensure color‑contrast passes WCAG AA (the token palette is pre‑tuned; deviations are your responsibility).

---

### 6 · State, Motion & Feedback

- **Animations** – only `animate-[spin|ping|bounce|accordion-up|accordion-down]`.
- Duration/easing are fixed in `tailwind.config.js`; do not inline `transition` props.
- **Loading / Error states** – every async component must expose at least: “idle”, “loading”, “error”, “success”.

---

### 7 · Type Safety & Dependencies

- **TypeScript strict mode**; never use `any`, `unknown`, or `@ts-ignore`.
- Do not introduce new packages without prior approval—stick to: React 18, Next.js, shadcn/ui, Radix, Tailwind v3, and testing libs already present.

---

### 8 · Directory & Naming Conventions

```other
/components
    /ui
        /AlertDialog
            AlertDialog.tsx
            AlertDialog.test.tsx
            AlertDialog.stories.tsx
            index.ts          (re‑export)
```

- Component folder = PascalCase.
- CSS layers keyed to component name inside `globals.css` (rare).
- Utility classes follow **BEM‑like intent** comments when clarity is needed.

---

### 9 · Code Review Checklist

1. Uses only allowed tokens/utilities.
2. No duplicated component logic.
3. Passes unit tests + Storybook visual check.
4. Meets a11y rules (axe-core).
5. Bundle size unchanged or justified.
