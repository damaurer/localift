# Design System Document: High-End Editorial Fitness



## 1. Overview & Creative North Star: "The Locallift Monolith"

This design system rejects the cluttered, gamified aesthetic of legacy fitness apps. Our Creative North Star is **The Locallift Monolith**: a high-contrast, editorial experience that feels like a premium Swiss timepiece or a high-end fashion lookbook.



We break the "template" look by using **aggressive typographic scales** and **intentional asymmetry**. Layouts should prioritize large, breathable areas of `surface` and `background` to focus the eye on a single, high-stakes metric. By utilizing "nested depth" instead of borders, the UI feels carved from a single block of charcoal, illuminated by electric pulses of Locallift energy.



---



## 2. Colors: Depth Without Lines

The palette is built on a foundation of `surface` (deep charcoal) and `primary` (electric blue). We rely on tonal transitions to define the environment.



* **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. To separate a workout log from a summary, shift from `surface` to `surface-container-low`. The transition must be seamless, relying on the human eye’s ability to perceive value shifts.

* **Surface Hierarchy & Nesting:** Treat the interface as stacked layers of material.

* **Base:** `surface` (#0e0e0e)

* **Sectioning:** `surface-container` (#1a1a1a) or `surface-container-low` (#131313)

* **Interactive Cards:** `surface-container-high` (#20201f)

* **The "Glass & Gradient" Rule:** For floating action buttons or modal overlays, use `surface-variant` at 60% opacity with a `backdrop-blur` of 12px.

* **Signature Textures:** Main CTAs (e.g., "Start Workout") should use a subtle linear gradient from `primary` (#95aaff) to `primary-dim` (#3766ff) at a 135-degree angle to provide a sense of forward motion.



---



## 3. Typography: The Editorial Voice

We use a dual-sans-serif pairing to balance brutalist impact with technical precision.



* **Display & Headlines (Space Grotesk):** Used for "Hero" metrics—your current heart rate, the weight on the bar, or the timer. These should feel authoritative. Use `display-lg` for active set weights to ensure readability from 5 feet away during a lift.

* **Body & Labels (Manrope):** Used for technical data, instructions, and secondary navigation. Manrope’s geometric clarity ensures that `label-sm` remains legible even at high intensities.

* **Identity through Scale:** We achieve hierarchy not through color, but through drastic size shifts. A `display-md` weight value next to a `label-md` unit (e.g., "120" next to "KG") creates a professional, data-centric soul.



---



## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "software-standard." We use light and opacity to define space.



* **The Layering Principle:** To "lift" a set-entry card, place a `surface-container-highest` card on top of a `surface-container-low` background. The contrast in charcoal tones creates a natural, sophisticated lift.

* **Ambient Shadows:** For high-priority floating elements, use a shadow with a 32px blur, 0px offset, and 6% opacity using the `on-surface` color. It should feel like an atmospheric glow, not a shadow.

* **The "Ghost Border" Fallback:** If a boundary is required for accessibility in input fields, use `outline-variant` (#484847) at **15% opacity**. It should be felt, not seen.

* **Glassmorphism:** Navigation bars and "Finish Set" buttons should utilize `surface-bright` with 40% transparency and blur to let the "workout content" scroll behind them, maintaining the PWA’s immersive feel.



---



## 5. Components: Functional Minimalism



### Buttons

* **Primary:** Uses the `primary` to `primary-dim` gradient. `Roundedness: md` (0.375rem). Text is `on-primary` (deep navy) for maximum contrast.

* **Secondary:** `surface-container-highest` background with `on-surface` text. No border.

* **Tertiary:** Ghost style. No background, `primary` text, `label-md` uppercase.



### Input Fields (Sets, Reps, Weight)

* **Styling:** Forbid traditional "box" inputs. Use a "Large-Value" approach. The input value uses `headline-lg`, with the label (e.g., "REPS") in `label-sm` positioned absolute-top-left.

* **State:** When focused, the background shifts from `surface-container` to `surface-bright`.

* **Success State:** A subtle `primary` glow (using the ambient shadow rule) appears behind the input.



### Cards & Lists

* **Workout Log Items:** Do not use dividers. Use `Spacing: 4` (1rem) between items.

* **Visual Separation:** Alternate background tones between `surface` and `surface-container-low` for long lists to create a "Zebra" striping effect that is sophisticated rather than utilitarian.



### Navigation (Thumb-Friendly)

* **The "Bottom Anchor":** All primary actions (Start, Pause, Log) must sit within the bottom 25% of the screen.

* **Floating Action Bar:** A glassmorphic pill-shaped bar using `surface-container-highest` (80% opacity) floating 20px from the bottom edge.



---



## 6. Do's and Don'ts



### Do

* **Do** use `Spacing: 12` and `16` for top-level padding to create a "Gallery" feel.

* **Do** use `primary` sparingly. It is "Locallift energy"—use it only for the thing the user needs to touch *right now*.

* **Do** favor `headline-sm` for labels over `body-md` to maintain the editorial strength.



### Don't

* **Don't** use 1px dividers. If you feel the need for a line, use a 12px gap instead.

* **Don't** use standard "Success Green." Use `primary` for all positive/active states to maintain the signature brand identity.

* **Don't** use `Roundedness: full` for everything. Reserve it only for small tags/chips; keep main containers at `md` or `lg` to maintain a professional, architectural edge.