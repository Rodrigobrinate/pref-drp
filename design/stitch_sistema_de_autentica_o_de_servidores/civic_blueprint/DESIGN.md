```markdown
# Design System Document: The Authoritative Institutional Portal

## 1. Overview & Creative North Star: "The Modern Archive"

This design system is built upon the North Star of **"The Modern Archive."** In a government and institutional context, users seek more than just information; they seek a sense of permanence, stability, and quiet authority. We move away from the "generic corporate portal" by embracing a sophisticated, editorial approach.

While standard portals rely on heavy borders and loud grids, "The Modern Archive" utilizes **Tonal Depth** and **Intentional Asymmetry**. We replace rigid structure with breathable white space and layered surfaces, creating a digital environment that feels as curated as a high-end physical institution. The goal is to project an image of a government that is transparent, modern, and profoundly organized.

---

## 2. Colors: Tonal Architecture

This palette is designed to evoke "Institutional Trust." We use deep oceanic blues to provide gravity, while the light surface tiers provide a sense of openness and air.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or containers. 
Traditional lines create visual noise and "box in" the user. Instead, boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit on a `surface` background to denote a change in context.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers, similar to stacked sheets of premium vellum.
- **Base Layer:** `surface` (#f3faff)
- **Nested Content:** Use `surface-container-low` (#e6f6ff) for secondary modules.
- **High-Priority Containers:** Use `surface-container-lowest` (#ffffff) to make cards "pop" against a tinted background.
- **Glassmorphism:** For floating navigation or modal overlays, use `surface` with a 70% opacity and a `20px` backdrop-blur. This creates a "frosted glass" effect that keeps the user grounded in their current context.

### Signature Textures
To add "soul" to the authoritative aesthetic, avoid flat primary colors on large areas. Use a subtle linear gradient (135°) from `primary` (#001d44) to `primary_container` (#00326b) for Hero headers or major Action buttons. This adds a tactile, metallic sheen that feels premium rather than "default."

---

## 3. Typography: The Editorial Scale

We utilize two distinct sans-serifs to balance high-function legibility with institutional character.

*   **Public Sans (Display & Headlines):** A strong, neutral typeface intended for government use. It provides the "Authoritative" voice.
*   **Inter (Title & Body):** Optimized for screens, providing maximum legibility for complex data and long-form institutional text.

### The Hierarchy
- **Display (Large/Medium):** Used for landing page hero statements. These should be set with tight letter-spacing (-0.02em) to feel like a high-end broadsheet.
- **Headline (Small/Medium):** Used for section headers. Leverage `primary` (#001d44) to ensure the hierarchy is unmistakable.
- **Body (Large/Medium):** The workhorse. Use `on_surface` (#071e27) for primary reading and `on_surface_variant` (#43474f) for secondary metadata.

---

## 4. Elevation & Depth: Tonal Layering

We do not use shadows to create "3D" effects; we use them to create "Presence."

- **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card placed on a `surface-container` background provides a natural lift.
- **Ambient Shadows:** Shadows are only permitted for "Interactive" floating elements (e.g., dropdowns, modals). Use a 32px blur with 6% opacity. The shadow color must be a tint of `on_surface` (#071e27), never pure black.
- **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., in a high-contrast mode), use `outline_variant` (#c3c6d1) at **20% opacity**. This provides a "suggestion" of a line without breaking the minimalist aesthetic.

---

## 5. Components: Precision & Clarity

### Buttons
- **Primary:** A gradient of `primary` to `primary_container`. High-contrast `on_primary` text. Border radius: `md` (0.375rem).
- **Secondary:** Transparent background with a "Ghost Border" of `outline`.
- **Tertiary:** Text-only, using `primary` color with an underline on hover.

### Input Fields
- **Style:** Flat surfaces using `surface_container_highest` (#cfe6f2). 
- **States:** No borders on idle. On focus, a 2px bottom-bar of `primary` appears, rather than an all-around stroke. This feels modern and editorial.
- **Error State:** Transition the bottom-bar to `error` (#ba1a1a) and provide helper text in `on_error_container`.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines. 
- **Separation:** Use vertical white space (32px or 48px) to separate list items. For complex data tables, use alternating row colors between `surface` and `surface_container_low`.

### The "Institutional Badge" (Custom Component)
For government portals, use a "Badge" component for status updates (e.g., "Verified," "Pending"). Use `secondary_container` with `on_secondary_container` text. The shape should be `full` (pill) to contrast against the sharp, rectangular nature of the rest of the UI.

---

## 6. Do's and Don'ts

### Do:
- **Do** use generous margins. If you think there is enough white space, add 16px more.
- **Do** use `tertiary` (#460003) sparingly as an accent for "Urgent" notices only.
- **Do** ensure all interactive elements have a clear `surface_bright` hover state.

### Don't:
- **Don't** use 100% black text. Always use `on_surface` (#071e27) for better visual comfort.
- **Don't** use "Drop Shadows" on flat cards. Use background color shifts instead.
- **Don't** use the `primary` color for non-interactive elements. It must be reserved for "Action" and "Authority."
- **Don't** use sharp 0px corners. Use the `DEFAULT` (0.25rem) to soften the institutional feel just enough to seem approachable.

---

## 7. Spacing Scale
The spacing scale is based on an 8px grid. However, for "The Modern Archive" aesthetic, we favor large "Gutter" spaces (64px, 80px, 96px) between major content sections to allow the eye to rest and emphasize the high-end, minimalist nature of the portal.```