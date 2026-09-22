# Components

Components should encode repeated meaning and behavior. They are not a mandate to make every region look the same.

## Start from semantics

Name a component for what it does, not what it looks like. `PlanComparison`, `SearchResult`, and `RunStatus` preserve useful intent; `GradientCard` and `RoundedBox` lock in decoration without explaining behavior.

Create a shared component when structure, behavior, or accessibility repeats. Do not abstract a one-off composition prematurely just to make the page appear systematic.

## Adapt external systems

Use a template or component library to supply reliable primitives and behavior, not the product's identity. Adapt its tokens, typography, density, composition, and component selection to the visual premise. Do not inherit demo content, page structure, or decorative defaults merely because they are available.

## Preserve role distinctions

Buttons, links, filters, tags, statuses, and navigation items should not all become pills with similar styling. Their shapes, placement, states, and language should communicate different behaviors.

Use variants to express a bounded semantic difference, not every one-off visual exception. If a component accumulates many booleans and conditionals, reconsider whether the instances share one concept.

## Use cards for card-shaped content

A card is suitable when a unit is independently selectable, movable, comparable, actionable, or separated from a changing background. A heading and paragraph do not require a card simply because they form a content group.

Let featured items differ when their meaning differs. Uniform component chrome should not erase hierarchy.

On a restyle, keep existing card, FAQ, and CTA shells. Do not flatten those shells into uncontained stacks to look less like a template.

## Product frames

A product-in-browser frame (traffic lights, URL bar, desk chrome) is a component when it represents the product UI. That is not the same as wrapping every paragraph in a card. Do not strip that chrome as "container theater" if the mock is meant to look like a browser or app window.

## Build complete states

Implement applicable states from the start:

- default, hover, active, focus-visible, selected, and disabled;
- loading, empty, error, success, and partial data;
- short, long, missing, and user-generated content;
- permission-restricted or unavailable actions;
- touch, keyboard, and pointer behavior.

Keep focus visible. Ensure disabled controls remain legible and explain unavailable actions when useful.

## Make controls feel native to the product

Use familiar interaction conventions unless a different behavior creates a real advantage. Distinctiveness should usually come from composition, content, type, material, and details—not from making basic controls mysterious.

Use established icon libraries present in the project. Pair ambiguous icons with labels or accessible names. Do not draw inconsistent one-off symbols or fake third-party marks.

## Avoid component theater

Do not add tabs with one meaningful panel, carousels for three items that fit, dropdowns for two visible choices, or accordions merely to create interaction. Components should reduce cognitive or spatial complexity, not perform sophistication.

## Responsive components

Decide how behavior changes when space shrinks. Tables may need priority columns or horizontal scrolling; toolbars may wrap, group, or disclose; dense cards may become lists. Preserve important comparisons and actions rather than blindly stacking every child.

## Quick review

- Does each component represent a recurring concept?
- Can users distinguish action, navigation, status, and metadata?
- Are important states designed and testable?
- Has consistency erased meaningful hierarchy?
- Does the component handle realistic content and narrow widths?
- Is any interaction present only to make the interface feel more elaborate?
