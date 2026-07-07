---
name: Stock Manager
description: High-density command deck for precise inventory management and stock reconciliation.
colors:
  primary: "#0f172a"
  primary-hover: "#1e293b"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  neutral-border: "#e2e8f0"
  neutral-text: "#0f172a"
  neutral-muted: "#64748b"
  neutral-subtle: "#94a3b8"
  success: "#10b981"
  success-bg: "#ecfdf5"
  warning: "#f59e0b"
  warning-bg: "#fffbeb"
  danger: "#ef4444"
  danger-bg: "#fef2f2"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: Stock Manager

## 1. Overview

**Creative North Star: "The Command Deck"**

The Command Deck is a high-density, precise control center engineered for rapid inventory operations. The aesthetic priorities are speed of interpretation, absolute data integrity, and unambiguous system state feedback. It leverages structured sub-borders, clear keyboard focus rings, and explicit status states to turn complex administrative actions (like importing order sheets and fuzzy-matching SKU codes) into low-friction, high-speed micro-interactions.

This system explicitly rejects cluttered multi-nested cards, tiny low-contrast gray text on tinted backgrounds, distracting gradient text, and oversimplified empty space layouts that demand excessive scrolling.

**Key Characteristics:**
- High informational density without visual noise.
- Crisp, slate-based neutral dividers and micro-borders defining logical boundaries.
- Prompt-feedback visual hierarchy for fuzzy matching confidence tiers.

## 2. Colors

The Stock Manager color system relies on high-contrast Slate neutrals accented by functional semantic states.

### Primary
- **Ink Black** (#0f172a): Used for brand headers, primary control buttons, active navigation, and dominant body text to command attention.

### Neutral
- **Slate Deep** (#0f172a): Default text color ensuring deep contrast.
- **Slate Gray** (#64748b): Secondary text, descriptive annotations, and neutral icons.
- **Slate Muted** (#94a3b8): Placeholders, borders, and disabled controls.
- **Slate Border** (#e2e8f0): Thin division lines and component outlines.
- **Slate Canvas** (#f8fafc): Primary background color of the application dashboard.
- **Slate Surface** (#ffffff): Card bases, dialogs, and active page content surfaces.

### Semantic States
- **Emerald** (#10b981): Indicates success, high-confidence fuzzy matches (≥75%), and active stock health.
- **Emerald Light** (#ecfdf5): Soft background for successful notifications and mapped item cells.
- **Amber** (#f59e0b): Indicates warning, pending reviews, or medium-confidence fuzzy matches (40–74%).
- **Amber Light** (#fffbeb): Soft background alert for pending actions.
- **Crimson** (#ef4444): Indicates danger, low stock alert, or unmapped/low-confidence items (<40%).
- **Crimson Light** (#fef2f2): Soft background highlighting error states or low stock.

### Named Rules
**The Rarity of Primary Accent Rule.** The high-contrast Ink Black primary accent is restricted to dominant action points and main headers (≤10% of screen elements). This ensures the user's eye is instantly drawn to core action triggers.

**The Contrast Over Elegance Rule.** High-contrast readability is mandatory. Gray text against white or off-white backgrounds must meet WCAG AA standards (minimum contrast ratio of 4.5:1). "Elegant" light-gray text on tinted white is strictly prohibited.

## 3. Typography

**Display Font:** Inter, system-ui, sans-serif
**Body Font:** Inter, system-ui, sans-serif

**Character:** Standardized on Inter across all interfaces. The typography system emphasizes crisp legibility under any screen density, varying weight (from 400 to 700) rather than typeface family to create clean hierarchy.

### Hierarchy
- **Display** (Bold 700, 2.25rem, 1.2): Reserved for dashboard main metrics and landing-level title points.
- **Headline** (Semi-bold 600, 1.5rem, 1.3): Page headers and screen titles.
- **Title** (Semi-bold 600, 1.125rem, 1.4): Section headers, card titles, and modal headers.
- **Body** (Regular 400, 0.875rem, 1.5): Standard data values, descriptive copy, and general system text. Max line length is capped at 75ch.
- **Label** (Medium 500, 0.75rem, 1, letter-spacing 0.05em, uppercase): Column headers, badges, and status labels.

### Named Rules
**The Text-Wrap Balance Rule.** All H1 through H3 titles must utilize `text-wrap: balance` to prevent awkward typography wrapping on narrow screens. Long tables or descriptions must use `text-wrap: pretty` to eliminate typographic orphans.

## 4. Elevation

The Command Deck values flat structure with tonal boundaries over complex dimensional shadows. Elevation shadows are applied sparingly to avoid visual noise.

### Shadow Vocabulary
- **Tactile Hover** (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.025)`): Applied to active hover states on interactive dashboard cards and button actions.
- **Modal Overlay** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.025)`): Applied exclusively to dropdown lists, context popovers, and dialog boxes to separate them from the primary deck.

### Named Rules
**The Flat-by-Default Rule.** All workspace surfaces, tables, lists, and forms must remain entirely flat at rest. Depth is established through slate borders (#e2e8f0) and subtle background variations rather than shadows. Shadows are reserved for reactive hover responses or floating UI.

## 5. Components

### Buttons
- **Shape:** Soft square (8px / `--border-radius-sm` or 12px / `--border-radius-md`)
- **Primary:** Background Ink Black (#0f172a), Text Slate Surface (#ffffff). Highly tactile with an active inset transform on click.
- **Hover / Focus:** Hover changes background to Slate Deep-Hover (#1e293b). Focus renders a prominent dual-ring focus outline.
- **Secondary / Ghost:** Transparent background with Slate Border (#e2e8f0) stroke, hovering into soft Slate Light (#f1f5f9) background.

### Cards / Containers
- **Corner Style:** Rounded (12px / `--border-radius-md`)
- **Background:** Slate Surface (#ffffff) at rest.
- **Shadow Strategy:** Flat by default, lifting slightly into Tactile Hover on interaction.
- **Border:** 1px solid Slate Border (#e2e8f0).
- **Internal Padding:** Spacing Medium (16px or 24px) depending on density needs.

### Inputs / Fields
- **Style:** 1px stroke Slate Border (#e2e8f0), background Slate Surface (#ffffff), rounded to 8px.
- **Focus:** Sharp dark-ring border transition with no fuzzy glow.
- **Error:** Accent stroke shifts to Crimson Red (#ef4444) with soft Crimson Light (#fef2f2) background.

### Navigation
- **Style:** Fixed vertical sidebar of width 280px. Uses Slate Surface background with active item indicator in Slate Light (#f1f5f9) background and active Ink Black text. Sidebar is fully collapsible.

## 6. Do's and Don'ts

### Do:
- **Do** maintain a strict 1px slate-border separating primary tables and spreadsheet rows.
- **Do** use clear semantic color alerts (Emerald, Amber, Crimson) specifically to denote Sorensen-Dice fuzzy-match confidence tiers.
- **Do** apply dual-ring focus outline indicators on every keyboard focus action.
- **Do** clamp long body copy to a maximum line length of 75ch to prevent scanning fatigue.

### Don't:
- **Don't** use colored side-stripe borders (e.g. `border-left` thicker than 1px) to decorate card or spreadsheet lists.
- **Don't** apply decorative gradients or text-background-clipping.
- **Don't** use glassmorphism or backdrop filters as default scaffolding.
- **Don't** hide critical system alerts under low-contrast gray text on tinted white backgrounds.
- **Don't** create identical repeating grid cards of simple icons and labels; use structured lists instead.
