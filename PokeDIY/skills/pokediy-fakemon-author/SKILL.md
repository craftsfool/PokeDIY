---
name: pokediy-fakemon-author
description: Create, revise, balance, validate, and illustrate original monster designs for PokeDIY. Use when Codex needs to design a Fakemon or evolution line, turn a concept into PokeDIY-compatible JSON, reference existing Pokémon moves or abilities, define evolution or special-form relationships, write 52Poké-style encyclopedia content, or generate visually consistent flat-color creature artwork instead of realistic AI imagery.
---

# PokeDIY Fakemon Author

Create an original creature as one coherent design system: concept, mechanics, encyclopedia copy, importable JSON, and consistent flat-color artwork.

## Workflow

1. Capture the brief: motif, temperament, habitat, stage count, desired types, battle role, and any supplied sketch. Infer non-critical gaps; ask only when a missing choice would materially change the result.
2. Read [references/design-rules.md](references/design-rules.md) before assigning stats, abilities, moves, or evolution methods.
3. Read [references/pokediy-schema.md](references/pokediy-schema.md) before creating or editing JSON.
4. Search the project's local datasets before naming an official move, ability, species, form, or evolution method. Prefer exact local IDs and Simplified Chinese names. Resolve the data root before searching: it is `data/` from the Git worktree root and `../data/` from the `PokeDIY/` app directory. Search `reference/original-content.json`, `reference/evolution-methods.json`, `national/national-pokedex.json`, and `national/pokemon-forms.json` below that root with `rg` or a JSON-aware tool.
5. Build the mechanical identity around one clear play pattern. Use one or two regular abilities, optionally one hidden ability, and a learnset with valid acquisition values: `-`, `进化`, or an integer from 1 to 100.
6. Write the PokeDIY JSON. Keep `image` empty until final artwork is ready; the website imports the remaining fields and the user can upload the generated PNG.
7. Resolve bundled paths relative to this `SKILL.md`, then run `python <skill-dir>/scripts/validate_pokediy.py <draft.json>`. Fix every error. Review warnings deliberately rather than suppressing them.
8. For artwork, read [references/art-direction.md](references/art-direction.md), then run `python <skill-dir>/scripts/build_art_prompt.py <draft.json> --out <prompt.txt>` to produce the locked visual recipe.
9. Generate artwork with the built-in image generation tool. For a supplied sketch, treat it as the edit target and preserve silhouette, markings, proportions, and palette unless the user requests redesign. For an evolution line, approve the first stage as the style anchor and include that accepted image as a style reference for each later stage.
10. Inspect the result against the acceptance checklist in `art-direction.md`. Iterate on one failed property at a time. Do not accept realistic fur, gradients, painterly texture, 3D material rendering, cinematic light, or a busy background.
11. Deliver the validated JSON, final prompt, artwork path, validation result, and any attribution/license notes. Never imply that a fan design is official.

## Non-negotiable rules

- Create original silhouettes and markings. Do not trace, splice, or closely imitate an existing character.
- Describe observable visual properties; do not request the style of a named living artist.
- Keep one or two types.
- Allow one or two regular abilities in one list; allow zero or one hidden ability. Never model ordinary abilities as fixed A/B slots.
- Use `relationshipMode: "form"` only when `evolutionBase`, `formCategory`, and `formLabel` are set.
- Keep all six stats between 1 and 255. Treat a high total as an explicit power-budget decision.
- Reference official content by local dataset ID. Put invented abilities and moves in `custom` and mark them `source: "原创"`.
- Keep encyclopedia prose concise, concrete, and ecological. Separate factual game mechanics from flavor text.
- Preserve the site's CC BY-NC-SA 3.0 publication notice. Attribute user-supplied or commissioned artwork accurately.

## Output shape

Return these artifacts when the request includes a complete design:

1. A short concept summary and battle identity.
2. A PokeDIY-compatible JSON file.
3. A validation report with base-stat total.
4. A generated transparent or flat-background PNG when imagery is requested.
5. The exact image prompt and style profile version (`pokediy-flat-v1`).

Use [references/pokediy-schema.md](references/pokediy-schema.md) for field semantics, [references/design-rules.md](references/design-rules.md) for mechanical review, and [references/art-direction.md](references/art-direction.md) for all illustration work.
