---
name: ai-web-design
description: Design, implement, or refine distinctive web interfaces whose visual language follows the product, audience, content, and existing brand rather than recognizable AI-generated defaults. Use for landing pages, marketing sites, product interfaces, dashboards, portfolios, frontend components, and substantial UI restyling where composition, typography, color, components, responsive behavior, or visual polish matter.
---

# AI Web Design

Create a coherent interface, not a collage of fashionable patterns. Treat every familiar pattern as available but optional.

## Operating principle

Patterns are not banned. They are banned as unthinking defaults.

Use a gradient, card, centered hero, pill, bento grid, glass surface, oversized type, or sparse layout when the project gives it a job. Do not use it merely because it is a common way for generated websites to look finished.

Preserve an existing brand, component system, and product language unless the user explicitly requests a departure. When no system exists, derive one from the context rather than importing a house style.

## Workflow

### 1. Read the project

Inspect the current interface, content, assets, framework, component primitives, tokens, and constraints before choosing a direction. Reuse strong existing decisions. Identify what is fixed and what may change.

On an existing site, inventory:

- layout contracts: max-width columns, section wrappers, padding scale, and shared heroes;
- template families: home, product, tools, resources, pricing, and legal, and which of them share a pattern;
- what is frozen: copy, image files, image sizes, SEO YAML, and URLs;
- existing component shells: cards, FAQ, CTAs, and product-in-browser frames.

For a new interface, establish:

- the audience and their level of familiarity;
- the context of use, including device, environment, urgency, and available attention;
- the primary action or task;
- the content hierarchy and likely content volume;
- the desired character in plain language;
- the accessibility, performance, and technical constraints;
- the conventions of the product category worth keeping or challenging.

Do not invent brand facts or product claims to fill visual space. Use clearly provisional copy when real content is missing.

### 2. Establish visual direction

Read [visual-direction.md](references/visual-direction.md). Use supplied references, brand assets, and the existing interface when available. If research tools are available and research would materially help, gather relevant references; otherwise derive the direction from the brand, audience, content, and product context. Never block because references are missing.

Write one sentence that connects the interface's character to its purpose. Make it specific enough to reject plausible alternatives.

Good: “A dense field notebook for working researchers: compact, annotated, and calm, with evidence always close to the claim.”

Weak: “A clean, modern experience with gradients and cards.”

Choose two or three supporting decisions—such as editorial typography, a diagram-led composition, compact information density, or a material-inspired surface system. Do not stack unrelated motifs or substitute adjectives such as “modern,” “clean,” or “premium” for direction.

### 3. Shape the page before styling it

For a substantial new page or redesign, establish a rough page skeleton before detailed styling or component implementation. Define hierarchy, section order, relative scale, density, alignment, major visual anchors, grid, and responsive behavior. A text outline or block sketch is enough. Let content relationships determine containers. Read [composition.md](references/composition.md) whenever creating or materially restructuring a page.

### 4. Ground a small design system

Extend a mature existing system when one is present. Otherwise define only the provisional roles and constraints the interface needs:

- type roles and scale;
- color roles and contrast behavior;
- spacing rhythm and layout bounds;
- surfaces, borders, radii, and elevation;
- interaction and motion principles;
- component states.

For multi-page or product work, test these decisions on one representative screen or flow. Refine shared tokens and components from that result before expanding. Do not invent a complete system in the abstract or let the pilot remain an unrelated one-off.

For multi-screen or ongoing work, record settled visual decisions in the project's existing tokens, theme, or a compact design reference. Update that source when decisions change. Do not rely on prompt history to preserve the system.

Read [typography.md](references/typography.md), [color.md](references/color.md), and [components.md](references/components.md) for the relevant decisions. Use variables or tokens so the result is coherent and easy to revise.

### 5. Implement the real experience

Build semantic, accessible structure. Include the states implied by the product: empty, loading, error, selected, disabled, focus, hover, long content, and narrow screens as applicable. Keep decoration subordinate to comprehension and interaction.

A restyle of an existing site is subtractive. Drop unused decoration. Do not replace the information architecture unless the user asked. Do not merge full-bleed and column constraints onto one element. Do not change `width`, `max-width`, or `src` dimensions on existing images unless the user asked. Do not edit front matter, headings, or body copy as a side effect of styling.

Prefer one memorable, context-specific idea carried through the interface over many generic flourishes. Give visual weight to meaningful assets—product imagery, photography, illustration, diagrams, editorial graphics, video, texture, or bespoke interaction—when they support the premise and content. Reuse suitable existing assets and established libraries before fabricating replacements. Do not approximate brand marks or use glows, gradients, blobs, gratuitous icons, and shadows as a substitute for meaningful material.

### 6. Review at rendered size

Render or run the interface and inspect it, ideally at multiple viewport widths. Do not treat clean code as evidence of good design. Read [visual-review.md](references/visual-review.md) and complete both the functional and aesthetic passes.

If the interface feels generated, diagnose clusters of unused decoration. Do not remove cards, centering, or window chrome on sight. Compare before and after on every template family, not one homepage hero. Check header alignment against hero gutters at a wide viewport. Consult [anti-patterns.md](references/anti-patterns.md) and compare [bad-patterns.md](examples/bad-patterns.md) with [good-patterns.md](examples/good-patterns.md).

## Decision test

For any conspicuous choice, be able to answer:

1. What job does it do?
2. What project-specific evidence supports it?
3. What simpler choice was considered?
4. Does it still work with real content and on a narrow screen?

If there is no useful answer, simplify or choose again.

## Completion standard

Finish only when the interface:

- has a recognizable hierarchy and a defensible visual premise;
- does not depend on a pile of default AI motifs for personality;
- remains coherent across responsive sizes and realistic content;
- exposes appropriate interaction states and visible focus;
- meets practical contrast and legibility needs;
- feels native to this product rather than portable to any product with a logo swap.
