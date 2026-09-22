---
name: Ledger
description: Personal finance register printed on cool chalk paper — hairline rules, one ultramarine ink, money measured in monospace figures.
colors:
  primary: "#21409A"
  primary-deep: "#172E7A"
  primary-soft: "#E9EDF7"
  paper: "#F4F4F0"
  sheet: "#FFFFFF"
  sheet-sunken: "#FAFAF6"
  rail: "#F0F0EB"
  ink: "#191B1F"
  ink-muted: "#4C4F57"
  ink-dim: "#6A6D74"
  hairline: "#E3E2DC"
  hairline-mid: "#CECDC4"
  line-strong: "#94938A"
  green-ledger: "#2E6B45"
  red-ledger: "#B4232C"
  amber-ledger: "#8F6400"
  green-soft: "#E6EFE8"
  red-soft: "#F6E7E8"
  amber-soft: "#F7F0DD"
typography:
  display:
    fontFamily: "Schibsted Grotesk"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Schibsted Grotesk"
    fontSize: "19px"
    fontWeight: 600
  title:
    fontFamily: "Schibsted Grotesk"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Schibsted Grotesk"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Schibsted Grotesk"
    fontSize: "12.5px"
    fontWeight: 600
  data:
    fontFamily: "Fragment Mono"
    fontSize: "13.5px"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  sm: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "22px"
  xl: "34px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "8px 15px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "8px 15px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    padding: "8px 15px"
  button-danger:
    backgroundColor: "{colors.red-ledger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "8px 15px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 12px"
  card-sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sm}"
    padding: "22px 24px"
  nav-item:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
  nav-item-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  category-chip:
    backgroundColor: "{colors.sheet-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "3px 9px"
  status-mark-cleared:
    backgroundColor: "{colors.ink}"
    rounded: "50%"
  status-mark-pending:
    textColor: "{colors.amber-ledger}"
    rounded: "50%"
---

# Design System: Ledger

## Overview

**Creative North Star: "The Printed Register"**

Ledger is a personal finance app that behaves like a physical statement and kept
register: cool chalk-paper ground, near-black ink, hairline rules instead of floating
cards. The interface reads as print that happens to be interactive. Content sits on
flat white "statement sheets" with 2px corners and a hairline border, arranged on a
paper-colored page. Nothing floats; nothing stacks; there is exactly one level of
surface.

Money is treated as a measured thing, not an ornament. Every amount, balance, and
percentage is set in Fragment Mono with tabular figures and an explicit `+` or `−`
sign, the way a ledger does arithmetic by hand. The UI voice — navigation, headings,
labels — is Schibsted Grotesk: a utilitarian grotesque that looks typeset and calm.

Color is spent on one accent and on state. A single ultramarine ink takes every
action role (primary buttons, links, focus, active nav, the hero rule). It is scarce:
most of the screen is paper, ink text, and hairlines. Income and expense amounts are
not painted green and red; they share the ink and differ only by sign, while deep
green, deep red, and amber are reserved for *state*: achieved, over budget, at risk.

**Key Characteristics:**
- One level of surface: sheets on paper, hairline rules, no nested cards or raised panels.
- Money always in mono with a `+`/`−` sign; UI text in a grotesque.
- One ultramarine accent on a small share of any screen; dark ink everywhere else.
- Sharp corners everywhere (2px radius); no pills, gradients, glow, or glass.
- A register that behaves like a statement: date-sorted, running balance, cleared/pending dots.

## Colors

A cool, chalk-white ground carries near-black ink and one ultramarine accent. Color is
state, not decoration.

### Primary
- **Ultramarine Ink** (#21409A): the single accent. Primary buttons, links, focus rings,
  active nav, the hero rule, selected segments. Rarity is the point — it appears on a
  small share of any screen.
- **Ultramarine Deep** (#172E7A): hover/down state of primary buttons.
- **Ultramarine Wash** (#E9EDF7): faint tint behind badges, icon dots, and selection.

### Neutral
- **Cool Paper** (#F4F4F0): the page ground.
- **Statement Sheet** (#FFFFFF): every card, sheet, table, modal, and input.
- **Sunken Sheet** (#FAFAF6): hover row tint and quieter fills.
- **Rail Paper** (#F0F0EB): the left index rail (desktop) and listive groupings.
- **Register Ink** (#191B1F): primary text and the filled "cleared" dot.
- **Faint Ink** (#4C4F57): secondary text.
- **Dim Ink** (#6A6D74): meta text, dates, captions — passes AA on paper, rail, and white.
- **Hairline** (#E3E2DC): decorative rules between rows and around sheets.
- **Hairline Mid** (#CECDC4): table header underlines and resting tool boundaries.
- **Strong Line** (#94938A): the boundary of interactive controls (inputs, pickers) — ≥3:1 on white.

### State colors
- **Achieved Green** (#2E6B45): goal completion, positive deltas, "done" badges. Soft tint #E6EFE8.
- **Over Red** (#B4232C): over-budget, danger actions, delete, error copy. Soft tint #F6E7E8.
- **At-Risk Amber** (#8F6400): pending marks, near-limit warnings. Soft tint #F7F0DD.

### Named Rules
**The One Ink Rule.** Only ultramarine (#21409A) may act as an accent for action,
link, focus, or active state — never a second brand color, never a gradient.
**The State-Only Color Rule.** Green, red, and amber appear only as *state* (achieved,
over, pending/at-risk). Income and expense amounts are ink-colored and sign-marked,
not green and red.

## Typography

**Display Font:** Schibsted Grotesk (variable 100–900; used 400–700)
**Body Font:** Schibsted Grotesk
**Data/Mono Font:** Fragment Mono — reserved for figures and aligning columns

**Character:** A utilitarian grotesque for the interface voice meets a true monospace
for measurement. Notes feel typeset but warm, like a well-kept statement. Schibsted
has a slightly softened grotesque cut — confident, not clinical. Fragment Mono is
square-holed and tabular, so columns of money line up like an annotated register
column.

Both faces are self-hosted (variable woff2, latin subset) at `/fonts/` for privacy.

### Hierarchy
- **Display** (Schibsted 600, 30px, 1.1, −0.02em): page titles only.
- **Hero Figure** (Fragment Mono 600, 52px, 1.05, −0.03em): the dashboard Net; the single largest figure in the app.
- **Headline** (Schibsted 600, 19px): form and modal titles.
- **Title** (Schibsted 600, 15px): card heads and section heads.
- **Body** (Schibsted 400, 14.5px, 1.5): default text. Keep lines ≤ 72ch.
- **Label** (Schibsted 600, 12.5px): field labels, kickers, column heads.
- **Data** (Fragment Mono 600, 13.5px, tabular): all figures — amounts, balances, percentages, running balance.

### Named Rules
**The Measured Figure Rule.** Every amount, balance, and percentage renders in
Fragment Mono with `font-variant-numeric: tabular-nums` and an explicit `+`/`−` prefix.
Proportional type never sets a number that represents money.

## Layout

Desktop is a three-part page: a fixed 230px left index rail (rail paper, hairline
right rule), then a masthead (kicker, page title, and the global "Record" quick-entry
to `/transactions/new`), then a centered content column with a 1160px max width and
34px gutters. Content gaps follow a scale of 8 / 16 / 22 / 34.

Surfaces are laid out in ruled grids rather than floated cards: a section head with a
hairline underline opens each block, and tabular or charted content sits on a sheet.
Two-column stacks use `repeat(auto-fit, minmax(340px, 1fr))` so sheets keep readable
width. The register is a full-width sheet with a table that keeps its hairline rows
and scrolls horizontally inside the sheet on small screens (`table-scroll`).

Mobile (≤960px): the rail hides. A bottom thumb tabbar carries Register
(Transactions), Budgets, Goals, and More; More opens a small sheet-drawer with
Analytics and Settings. The masthead Record link persists. Tables and charts never
force horizontal page overflow: wide tables scroll inside their sheet.

## Elevation & Depth

Flat by doctrine. Sheets are distinguished from the paper ground by a white fill and
a hairline border — not by shadows. One soft "print shadow" is allowed so a sheet
reads as a physical statement lying on a desk rather than as a second page color:

- **Statement Shelf** (`0 1px 2px rgba(21,24,30,0.05), 0 14px 34px -22px rgba(21,24,30,0.25)`): cards, modals, drawers, toasts.

Depth is otherwise conveyed by rules and inks: header underlines, row hairlines, and
focus rings. Modal backdrops dim with a 0.45 black scrim plus a 2px blur.

### Named Rules
**The Single Level Rule.** Exactly one level of surface exists. A sheet may never
sit on another sheet; no nested cards, no raised panels, no stacked shadows.

## Shapes

Every corner is 2px (`--radius`). The form language is square-on-purpose: sheets,
buttons, inputs, badges, modals, and toasts all share the same 2px radii, so the
whole interface feels cut, not molded. Circles are reserved for two precise things:
status marks (cleared/pending dots) and category color dots in settings. Bars and
progress fills are squared with 1px ends. Inputs carry a 1px Strong Line boundary
(≥3:1); decorative structure uses hairline rules that may drop below 3:1 because they
carry no interactive meaning.

## Components

### Buttons
- **Shape:** flat, 2px radius, 1px border system; full-width on mobile where needed.
- **Primary:** ultramarine fill (#21409A), white text, deep-ultramarine border; hover #172E7A, active nudges down 1px. Used for one action per view (Record, Save, Import).
- **Ghost:** transparent fill, mid-ink text, hairline-mid border; hover darkens border to ink.
- **Subtle:** ultramarine wash fill, ultramarine text; for contextual secondary actions.
- **Danger:** deep red fill and red-ghost outline reserved for destructive actions (Delete).
- **States:** `:focus-visible` shows a 2px ultramarine outline offset 2px; disabled is 45% opacity with `not-allowed`.

### Inputs / Fields
- **Style:** 1px Strong Line boundary (#94938A), white fill, 2px radius, tabular figure support.
- **Focus:** border flips to ultramarine with a 3px ultramarine-28% ring — never outline-only—and it passes on light ground.
- **Segments:** the income/expense type switch is a segmented control with a Strong Line frame; the active segment fills with the state tint (ink-drawn amounts, so this is one of the few places tint carries meaning).
- **Errors:** red copy + existing stroke; a danger tinted toast confirms failures.

### Cards / Sheets
- **Corner Style:** 2px radius.
- **Background:** white on paper; `padded` variant uses 22×24 padding.
- **Shadow:** one Statement Shelf shadow (see Elevation), flat by default.
- **Border:** 1px hairline (#E3E2DC).
- **Rows inside:** hairlines at 1px; hover warms the row to Sunken Sheet.

### Navigation
- **Rail (desktop):** rail-paper column, hairline right rule; items are ink-muted text with a 12px inset; active = white sheet fill, ultramarine text, and a 3px ultramarine left rule; hover = white fill.
- **Masthead:** kicker, page title, and the global Record quick-entry (primary button).
- **Tabbar (mobile ≤960px):** white sheet bar atop a hairline-mid rule; five labeled icon tabs; active = ultramarine; More opens a sheet-drawer with Analytics/Settings.

### Signature: The Register
A transaction table that behaves like a statement. Categorical amount cells are
Fragment Mono and sign-prefixed. A running-balance column appears when sorted by date,
computed over account chronology. Status is a dot: cleared = filled ink dot,
pending = hollow amber-ringed dot. Recurring rows carry a small circular "↻" badge in
ultramarine wash.

### Signature: The Statement Head (dashboard hero)
A statement sheet with a kicker line ("Statement for September 2026"), a month-over-
month delta, a 52px Fragment Mono Net figure (counts up on load, one authored motion,
respects `prefers-reduced-motion`), a 64×3 ultramarine rule that inks in, then a
ruled 3-column stat strip (spent, income, entries) separated by hairlines.

## Do's and Don'ts

### Do:
- **Do** set every amount, balance, and percentage in Fragment Mono with a `+`/`−` sign and tabular numbers.
- **Do** keep sheets flat on paper with hairline borders (1px #E3E2DC) and 2px corners.
- **Do** reserve ultramarine for action/link/focus/active and let it stay scarce.
- **Do** use filled ink dots for cleared and hollow amber dots for pending transactions.
- **Do** let tables scroll horizontally inside their sheet on mobile rather than breaking the page.
- **Do** scope motion to the one hero count/rule and disable it under reduced-motion.

### Don't:
- **Don't** add gradients, glow, glass, blurry cards, or pill-shaped anything.
- **Don't** paint income green and expenses red — sign them `+`/`−` in ink, and use color only as state.
- **Don't** use "money green/red" palettes, rounded SaaS cards, or blue pill CTAs that say "finance app".
- **Don't** set numbers in the proportional UI font.
- **Don't** nest cards or stack surfaces above one level.
- **Don't** use all-caps labels, middle-dot key-value strings, or "→" link tails.
- **Don't** use playful copy, exclamation marks, or marketing fluff — plain sentence-case verbs.