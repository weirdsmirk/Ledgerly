# Typography

Typography should express the product's voice while making the content easy to navigate and use.

## Choose type from context

Describe the needed qualities before naming a typeface: technical, institutional, warm, literary, utilitarian, youthful, archival, precise, or something else grounded in the project.

Evaluate candidate faces for:

- legibility at the sizes actually used;
- available weights, styles, numerals, and language support;
- loading cost and licensing;
- fit with existing brand assets;
- distinctive details that reinforce rather than overpower the premise.

Do not default to a popular neutral sans serif simply because it is available. Do not reject it when neutrality and broad UI coverage are exactly the job.

## Build roles, not a collection of sizes

Define a small set of semantic roles such as display, section heading, body, label, control, metadata, and code or data. Each role should have a reason for its family, size, weight, leading, tracking, and casing.

Use contrast that remains visible in the rendered interface. Adjacent roles differentiated by only a tiny size or color shift often collapse into sameness.

## Manage measure and leading

Set readable line lengths for prose and tighter measures for supporting text. Increase leading for long-form reading; keep display leading compact enough to hold its shape without collisions. Test the longest plausible copy.

Avoid center-aligning long paragraphs. Avoid forced line breaks that only work at one width. Use nonbreaking behavior sparingly for phrases that must stay together.

## Use weight deliberately

Too many bold elements flatten hierarchy. Reserve strong weight for actual emphasis, labels that need rapid scanning, and headings whose scale alone is insufficient. Ensure regular body text has adequate contrast and rendering quality.

## Pair only when the relationship helps

One family with a useful range may be stronger than an arbitrary sans-and-serif pairing. When pairing, assign clear roles and look for complementary proportions, texture, or historical character—not merely maximum contrast.

## Treat data and controls as typography

Use tabular numerals for changing aligned values when supported. Keep button and form labels readable without excessive tracking or all caps. Make placeholder text distinct without using it as the only label. Preserve zoom and user text-size behavior.

## Responsive type

Use fluid sizing where gradual change improves composition, with intentional minimum and maximum values. Do not scale every role by the same ratio. Test headings for wrapping and controls for fit at intermediate widths.

## Quick review

- Does the type have a project-specific voice without becoming costume?
- Are roles distinguishable at a glance?
- Is prose comfortable to read at real viewport sizes?
- Do long labels, localization, and user zoom survive?
- Are font files loaded efficiently with suitable fallbacks?
- Would the hierarchy remain clear in grayscale?
