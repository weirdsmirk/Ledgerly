# Surface brief — Ledger full UI redesign (replacement visual world)

Status: direction settled by user (2026-09-22). This file is a dev-only contract,
never shipped. DESIGN.md (written at finish) documents the built world.

## Product truth (frozen)
Ledger personal finance: transactions (CSV import/export, recurring, pending/cleared),
budgets, goals, analytics, settings. All backend routes, logic, data shapes, and
behaviors stay identical. React + Vite SPA, no chart library (hand-rolled SVG).

## Ask (from the user)
- Full restructure: free rein over IA, navigation, page composition.
- Usage: daily quick check-ins + weekly desktop budgeting + heavy data entry — all three.
- Must NOT feel like generic fintech (green/red money colors, rounded SaaS cards,
  blue pills, "premium finance" clichés) and must NOT feel playful/insubstantial.

## Scene
A careful person managing household money at a desk in daylight, working with printed
statements and a kept register. Light theme only. Mobile = daily glance + quick entry;
desktop = longer budgeting/analysis sessions.

## Visual world — "The printed register"
- Cool chalk-paper ground; near-black ink; hairline rules instead of floating cards.
- White "statement sheets" (2px radius, hairline border) only where tabular data or a
  chart plate lives. Single-level; no nesting, no shadows stacked.
- Money is a measured thing: every amount, balance, and percentage renders in
  Fragment Mono (tabular figures). UI text in Schibsted Grotesk.
- One accent ink: ultramarine (#21409A), reserved for primary action, links, focus,
  active nav. Income/expense amounts share the ink (like debit/credit columns) and
  always carry an explicit +/− prefix. Color is reserved for STATE: pending (hollow
  dot + amber), danger/over-budget (deep red), achieved (deep green), at risk (amber).
- Sharp corners everywhere (≤2px). No pills, no gradients, no glow, no glass.
- All-caps labels, middle-dot meta strings, and "→" link tails are banned.

## Typography
- UI/display: Schibsted Grotesk (self-hosted, variable 400–700).
- Data figures: Fragment Mono (self-hosted).
- Roles: display 30px/600 tight; section head 15px/600; body 14px/400; meta 12.5px/500.

## IA
- Desktop: left index rail (paper, hairline) + masthead (kicker, title, global
  "Record" quick-entry) + centered 1160px content column.
- Mobile (≤960px): bottom thumb tabbar (Register/Transactions/Budgets/Goals/More),
  "More" opens Analytics + Settings. Rail hidden.
- Global "Record" link to /transactions/new on every page.

## Signatures
1. Running balance column in the register (computed over account chronology; shown
   when sorted by date, like a statement).
2. Pending = hollow ink dot, Cleared = filled ink dot.
3. Dashboard hero: the month's Net figure counts/stamps in (one authored motion,
   reduced-motion safe).
4. Themed browser surfaces: selection, scrollbars, focus rings, caret, number inputs.

## Copy voice
Plain verbs, sentence case, no exclamation marks, no marketing fluff. "Ledger" keeps
its existing name (ledger is the domain object: the register).