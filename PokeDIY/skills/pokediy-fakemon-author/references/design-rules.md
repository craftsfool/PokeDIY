# Original creature design rules

## Contents

- Concept hierarchy
- Types and abilities
- Stats
- Moves
- Evolution and forms
- Encyclopedia copy

## Concept hierarchy

Build around three layers:

1. One primary motif that controls silhouette and behavior.
2. One supporting ecological or cultural motif.
3. One battle mechanic expressed visually.

If the design needs more than one sentence to explain its silhouette, simplify it. Avoid assembling unrelated animal parts merely to signal both types.

## Types and abilities

- Assign one or two types and show each through anatomy, behavior, habitat, or mechanics—not only palette.
- Choose one or two ordinary abilities. They are alternatives in one list, not fixed A/B form fields.
- Add at most one hidden ability.
- Prefer official abilities when they already express the intended behavior. Create a new ability only for a mechanic the existing library cannot represent.
- For a new ability, state trigger, target, duration, magnitude, reset timing, and exceptions. Avoid effects that provide several unrelated advantages.

## Stats

Every design needs one strength, one secondary strength, and at least one exploitable weakness. Avoid six uniformly good numbers.

Use these as review bands, not immutable franchise rules:

| Intended role | Typical total |
| --- | ---: |
| Early-stage or weak standalone | 250–350 |
| Middle evolution | 340–450 |
| Ordinary final evolution | 450–535 |
| Deliberately powerful final form | 536–600 |
| Exceptional / boss-like | Above 600; require explicit justification |

Check speed against bulk, and offensive stats against move power and setup access. A strong ability consumes part of the power budget.

## Moves

- Start with identity moves, then add STAB, utility, and limited coverage.
- Use a sensible level curve. Early levels teach basic attacks and identity; later levels teach stronger STAB, setup, recovery, or the signature move.
- PokeDIY learn values are exactly `-`, `进化`, or levels `1`–`100`.
- For an invented move, include type, category, power when applicable, accuracy, PP, priority if any, target, and a precise effect. The current PokeDIY form stores type/category/description; preserve extra numbers in the effect description if the UI lacks dedicated fields.
- Do not give universal coverage solely to remove counterplay.

## Evolution and forms

- Select an evolution method supported by the local `evolution-methods.json` whenever possible.
- Use `relationshipMode: "evolution"` for a link between species and `relationshipMode: "form"` for an alternate form of an existing species.
- A form must specify the base species/form slug, form category, and display label.
- Carry recognizable lineage motifs through each evolution stage.

## Encyclopedia copy

- Lead with an observable habit or ecological relationship.
- Keep claims concrete and internally consistent with height, weight, anatomy, abilities, and habitat.
- Use encyclopedic prose rather than marketing adjectives.
- Keep origin/name analysis separate from in-world Pokédex description.
- State clearly that the design is fan-made and not official.
