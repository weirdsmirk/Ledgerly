# Composition

Composition determines what the interface says before typography and color refine how it says it.

## Establish the skeleton first

For a substantial new page or redesign, outline the page before detailed styling or component implementation. A text outline, block diagram, or rough sketch is sufficient. Record section order, hierarchy, relative scale, density, alignment, major visual anchors, and the important responsive changes. Revise this skeleton while structural choices are still cheap.

Do not let a component library or familiar landing-page sequence decide the content flow. Reuse a conventional structure when it fits the task or argument, not merely because it is ready to implement.

## Start with information pressure

Estimate the density and shape of the real content. A focused campaign page, research tool, financial console, and image portfolio should not inherit the same section rhythm.

Identify:

- the primary object or idea;
- the supporting evidence;
- the main action and secondary paths;
- content that repeats versus content that forms a sequence;
- content that must remain visible while other content changes.

Build layout relationships from these facts.

## Create hierarchy with more than size

Use position, alignment, whitespace, density, contrast, containment, and sequence alongside scale. Limit the number of simultaneous focal points. Give one region clear priority, then construct a path through the rest.

Avoid making every section a self-contained promotional block. Let some sections be transitions, evidence, pauses, tools, or continuations.

## Choose a grid that serves the premise

A grid is an alignment system, not a visible style. Choose column count, gutters, and bounds based on content and expected viewport range. Break the grid only to communicate emphasis or relationship.

Asymmetry is useful when it creates direction, tension, or a meaningful size difference. Symmetry is useful when it creates focus, stability, or ceremony. Neither is inherently more distinctive.

## Control rhythm

Alternate density and openness intentionally. Repetition establishes expectation; a measured interruption creates emphasis. Avoid identical vertical padding and identical heading-treatment in every section.

Whitespace should clarify grouping and importance. Large empty areas are not automatically premium; dense layouts are not automatically cluttered.

## Resist unnecessary containment

Use a container when it defines a surface, scope, behavior, or meaningful group. Prefer alignment and spacing when the relationship is already clear. Nested rounded rectangles often signal unresolved structure.

Do not omit or merge existing max-width and padding wrappers. Do not put full-bleed (`width: 100%`) and column (`max-width` + horizontal padding) on the same node. Do not change image `max-width` or displayed size unless the user asked. Prefer keeping the current skeleton and restyling surfaces over inventing a new containment model.

## Design with the content, not around placeholders

Test short and long titles, uneven descriptions, missing media, real table columns, and realistic lists. Do not crop text or force equal heights solely to protect an idealized screenshot.

Use editorial composition for narrative material, comparison structures for comparable choices, spatial diagrams for systems, and dense tool layouts for repeated operational work. Choose the content form before choosing its decoration.

## Make responsive behavior compositional

Do not treat mobile as the desktop layout stacked in source order by default. Decide:

- what keeps priority;
- what reorders, collapses, scrolls, or becomes a disclosure;
- which relationships require adjacency;
- where tap targets and reachable controls must move;
- how navigation changes without hiding essential paths.

Check intermediate widths, not only a wide desktop and narrow phone. Prevent accidental single-word lines, orphaned controls, unusable tables, and media that overwhelms nearby content.

## Quick review

- Was the page skeleton established before detailed styling?
- Can a viewer identify the primary idea and action in a few seconds?
- Does section order follow a real task or argument?
- Are repeated dimensions tied to repeated meaning?
- Is there purposeful variation in pace?
- Could any container be removed without losing structure?
- Does the narrow layout preserve the intended hierarchy?
