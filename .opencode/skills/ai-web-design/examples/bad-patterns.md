# Bad patterns

These examples show weak design reasoning. They do not declare the visible pattern itself forbidden.

## Designing from a genre stereotype

> This is an AI product, so use a dark background, purple-to-cyan gradient, glowing orb, glass cards, and a futuristic grid.

Why it fails: the direction comes from the category label, not the product's audience, task, or character. A research assistant, children's tutor, and infrastructure debugger should not share a visual identity merely because all use AI.

## Building the standard landing-page stack first

> Add a centered hero, two call-to-action buttons, dashboard mockup, logo strip, three feature cards, testimonials, pricing, FAQ, and final call to action. We can fit the content afterward.

Why it fails: the layout dictates the argument. It assumes every visitor needs the same evidence in the same order and encourages placeholder claims.

## Banning a pattern instead of thinking

> Cards look AI-generated. Never use cards.

Why it fails: a card remains an effective representation of discrete, comparable, actionable content. The useful rule is to avoid cardifying content that has no need for independent containment.

## Restyling by deleting the current system

> Restyle an existing marketing site by left-aligning every section, dropping cards, flattening radii, removing browser chrome, and resizing screenshots.

Why it fails: that is a new design system, not a restyle. The useful move is to drop unused decoration and keep the layout, assets, copy, and component shells that already belong to the product.

## Adding distinction through more effects

> The page feels plain. Add gradient borders, soft shadows, glowing buttons, floating particles, and scroll animations.

Why it fails: effects are being used to hide weak hierarchy or an absent concept. They add activity without making the interface more specific.

## Abstracting decoration

> Create a reusable `GlowCard` with variants for features, testimonials, pricing, steps, metrics, and the final call to action.

Why it fails: unrelated content is forced into one visual container. Reuse should follow shared semantics and behavior, not a desire to make all sections match.

## Treating mobile as a stack

> Put every desktop column into one column at the mobile breakpoint.

Why it fails: source order may not match mobile priority, wide comparisons may become unreadable, and controls may end up far from the content they affect.

## Inventing proof for the composition

> Add “10,000+ teams,” five recognizable customer logos, and a sample activity feed so the hero feels complete.

Why it fails: fabricated evidence is misleading and shapes the design around nonexistent content. Use confirmed claims or a different content form.

## Polishing without rendering

> The spacing tokens and component APIs are consistent, so the design is finished.

Why it fails: consistency in code does not reveal awkward wrapping, weak emphasis, overflow, false affordances, or an interchangeable overall impression.

## Making everything quiet

> To avoid AI clichés, use one neutral font, grayscale colors, small type, thin borders, and identical spacing everywhere.

Why it fails: removing conspicuous motifs does not create intention. The result may still be generic, now through timidity and uniformity.
