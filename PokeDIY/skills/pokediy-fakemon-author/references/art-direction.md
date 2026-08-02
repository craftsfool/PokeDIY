# PokeDIY flat illustration direction

## Contents

- Style lock
- Prompt construction
- Transparent output
- Evolution-line consistency
- Acceptance checklist
- Failure corrections

## Style lock

Use style profile `pokediy-flat-v1` for every encyclopedia portrait. Lock these properties across a project:

| Surface | Required treatment |
| --- | --- |
| View | Full-body neutral three-quarter front view; all appendages visible |
| Silhouette | One dominant body mass plus at most three readable secondary masses |
| Outline | Dark charcoal, opaque, smooth, subtly tapered; heavier outside than inside |
| Interior lines | Sparse and functional; no hatching or sketch residue |
| Fill | Two to four flat local colors plus at most one accent |
| Shadow | One hard-edged cel-shadow family; approximately 10–18% of visible area |
| Highlight | Eyes and one small focal material only; no glossy coating |
| Texture | None unless the motif requires one simplified graphic mark |
| Lighting | Neutral and diagrammatic; no rim light or cinematic contrast |
| Background | Transparent final PNG or perfectly flat removable key color |
| Framing | Centered with 10–14% clear padding; no crop or cast shadow |

The goal is not to copy a named franchise artist. The goal is a consistent, readable monster-encyclopedia visual language built from observable drawing properties.

## Prompt construction

Generate the prompt with `scripts/build_art_prompt.py`. Keep the locked style and avoid blocks unchanged; edit only the subject block when iterating.

The subject block must state:

- body plan and approximate proportions;
- defining silhouette features;
- face and temperament;
- exact palette roles;
- important markings and where they begin/end;
- pose and facing direction;
- elements that must remain unchanged from a supplied sketch or earlier stage.

Prefer concrete geometry over mood words. For example, write “two broad leaf-shaped ears, each about half the torso height” instead of “cute leafy ears.”

Do not add “high detail”, “masterpiece”, “8K”, “cinematic”, “realistic”, “intricate”, or material-rendering terminology. These tokens push the result toward realism and texture.

## Transparent output

Use the built-in image generation path first. Request a perfectly flat chroma background and remove it with the installed imagegen helper. Choose a key color absent from the creature:

- Default: `#00ff00`.
- Green creature: use `#ff00ff`.
- Magenta creature: use `#00ffff`.

Require no cast/contact shadow, gradient, texture, reflection, floor plane, or key color inside the subject. After removal, verify an alpha channel, transparent corners, intact line edges, and no color fringe. Keep the keyed source only as an intermediate artifact.

## Evolution-line consistency

1. Finish the earliest stage first and treat the accepted PNG as the visual anchor.
2. Reuse it as an image reference for every later stage.
3. Lock eye construction, outline color, shadow direction, palette families, facing direction, and render density.
4. Carry forward two or three lineage motifs; evolve their geometry rather than replacing them.
5. Increase complexity gradually: early stage 1.0×, middle stage about 1.25×, final stage about 1.5× visible detail. Do not triple the number of markings or accessories.
6. Generate one stage per call. A multi-character sheet increases style drift and anatomy collisions.

For alternate forms, preserve species-defining proportions and change only the declared form features, palette, typing cues, and required anatomy.

## Acceptance checklist

Reject and revise unless every item passes:

- Full creature fits inside the frame with even padding.
- Silhouette reads at a 128 px thumbnail.
- Outer line is visibly heavier than interior lines.
- Color areas are opaque and flat; no airbrushed gradients.
- Only one hard-edged shadow family is present.
- No realistic fur strands, skin pores, scale microtexture, fabric weave, or PBR gloss.
- No rim light, depth of field, volumetric light, lens effect, or dramatic background.
- Face, limbs, and joints remain intentionally simplified.
- Design does not closely resemble an existing character.
- Background removal leaves clean antialiased edges.

## Failure corrections

Change one variable per retry and restate all invariants.

| Failure | Targeted correction |
| --- | --- |
| Too realistic | “Flatten all surfaces into opaque graphic color shapes; remove material texture and naturalistic anatomy.” |
| Too painterly | “Replace brush texture and blended values with crisp closed shapes and one hard cel-shadow layer.” |
| Looks 3D | “Remove specular response, ambient occlusion, rim light, depth, and soft shadows; render as a flat ink-and-fill drawing.” |
| Outline inconsistent | “Use one dark-charcoal contour system; heavy tapered exterior, sparse thinner interior lines.” |
| Too detailed | “Reduce markings to three large readable shapes; remove micro-detail and decorative accessories.” |
| Weak silhouette | “Separate appendages from the torso and exaggerate the two defining masses without changing the concept.” |
| Evolution drift | “Preserve the anchor image's eyes, contour color, palette family, shadow direction, and two lineage motifs.” |
| Dirty cutout | Regenerate on a uniform contrasting key with no ground shadow; then rerun matte removal and despill. |
