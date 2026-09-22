# Visual review

Review the rendered interface. Source code can be valid, consistent, and accessible while the composition still feels generic or broken.

## Prepare the review

Run the real page with representative content. Capture or inspect at least:

- a narrow phone-sized viewport;
- an intermediate width where layouts often become awkward;
- a wide desktop viewport;
- relevant open, selected, empty, loading, and error states.

Use the project's actual browser and screenshot workflow when available. Fix runtime errors before judging polish.

## Pass 1: function and resilience

Check:

- content order and semantic structure;
- keyboard navigation and visible focus;
- contrast, labels, target sizes, and reduced-motion behavior;
- overflow, clipping, overlap, and accidental horizontal scroll;
- long text, missing media, sparse data, and dense data;
- hover-only information and touch behavior;
- navigation and primary actions at every width;
- loading, empty, error, disabled, and success states as applicable.

Do not conceal defects with fixed heights, clipped copy, tiny type, or hidden overflow.

## Pass 2: hierarchy and character

First look from a distance or at reduced zoom. Identify the first three things that attract attention. Confirm that they match the intended hierarchy.

Then ask:

- Does the page express the stated visual premise?
- Which choices are specific to this audience, content, or product?
- Does the interface have a coherent rhythm rather than repeated section blocks?
- Is there one strong idea, or many unrelated effects?
- Are visual differences tied to differences in meaning?
- Is any important content visually timid?
- Does decoration clarify, or merely make the screenshot busier?

## AI-default audit

Do not mechanically remove every matching pattern. For each match, decide whether it performs a project-specific job. Keep and refine justified patterns. Replace only automatic ones.

Look for clusters rather than isolated patterns:

- interchangeable centered hero copy;
- purple-blue gradient emphasis without a brand reason;
- ornamental glows, blobs, grids, and glass;
- every content group inside a rounded card;
- icon-in-tinted-square feature grids;
- excessive pills and oversized radii;
- arbitrary bento spans;
- recognizable template or component-library defaults left unadapted;
- fake metrics, testimonials, activity, or dashboards;
- uniform spacing and equal visual weight across sections;
- generic copy that exists to fit the layout;
- header column vs hero column: same max-width and horizontal padding;
- image width and file unchanged from the pre-restyle page;
- copy and SEO YAML unchanged unless requested;
- tools, product, and inner templates reviewed, not only the homepage;
- browser-frame mocks still have their window controls if they had them before.

## Default-decision challenge

Identify several visible decisions that could have come from convention or the model's defaults—for example section order, alignment, card use, type choice, radius, icon treatment, imagery, or motion. For each, state:

- the project-specific reason for the choice;
- what credible alternative was considered;
- whether the choice still serves the premise with realistic content and responsive constraints.

If the reason reduces to “standard practice,” “it looks polished,” or “this is what sites like this use,” reconsider it. Keep common patterns when they have a better reason; the goal is conscious selection, not novelty.

## Simplification pass

Temporarily imagine the page without gradients, shadows, glows, decorative backgrounds, and motion. If hierarchy disappears, strengthen composition, type, spacing, and content relationships. Restore only the effects that add meaning or atmosphere.

Do not use this pass to uncard every region or strip window chrome. Remove effects that are not carrying meaning. Leave structure, containment, and product-frame chrome in place unless they fail the decision test.

## Compare against the premise

Complete this sentence: “This could only be for this project because…”

If the answer is only the logo, product name, or accent color, revisit the content form and composition. Do not reach for extra novelty. Make the interface more truthful to the product.

## Record and iterate

List concrete mismatches, not vague reactions:

- “The pricing card dominates the primary product demonstration.”
- “At 820 px, the heading wraps into an isolated final word.”
- “Four nested surfaces make one settings group look like four separate tasks.”

When a mismatch could recur elsewhere, determine whether a shared token, component convention, or design rule is missing or unclear. Fix the shared rule before applying local patches. Keep genuine exceptions local.

Fix the highest-level cause first: content order, layout, hierarchy, type, then decoration. Re-render after material changes.
