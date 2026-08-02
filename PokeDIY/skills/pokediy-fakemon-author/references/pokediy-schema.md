# PokeDIY JSON contract

## Contents

- Root object
- Resource IDs
- Abilities and moves
- Evolution and form relations
- Image handling
- Example

## Root object

PokeDIY imports a JSON object shaped like `src/data/library.js::initialDraft`. Unknown metadata fields such as `exportedAt` are ignored.

| Field | Type | Notes |
| --- | --- | --- |
| `image` | string | Empty or browser data URL; use the website uploader for a generated PNG |
| `name`, `jaName`, `enName` | string | Page name and multilingual names |
| `category` | string | Classification without duplicating “宝可梦” unnecessarily |
| `types` | string[] | One or two Simplified Chinese type names |
| `height`, `weight` | string/number | Metres and kilograms |
| `description` | string | In-world Pokédex copy |
| `origin`, `artist` | string | Design analysis and image attribution |
| `relationshipMode` | string | `evolution` or `form` |
| `evolutionBase` | string | Exact local species/form slug or empty |
| `evolutionDirection` | string | `into-custom` or `from-custom` |
| `evolutionCondition` | object | `{ "method": "...", "values": {...} }` |
| `formCategory`, `formLabel` | string | Required for form mode |
| `selected` | string[] | IDs of selected official and original resources |
| `abilitySelection` | object | `regular` array and one optional `hidden` ID |
| `learnMethods` | object | Move ID to `-`, `进化`, or level string |
| `custom` | object[] | Original abilities or moves |
| `stats` | object | `HP`, `攻击`, `防御`, `特攻`, `特防`, `速度` |

## Resource IDs

Search `../data/reference/original-content.json` for official move and ability slugs. Search the national/form JSON files for exact Pokémon slugs. Never invent an official ID from an English name when the local dataset is available.

Every referenced ability or move ID must appear in `selected`. Every original resource must have a unique stable ID beginning with `custom-`.

## Abilities and moves

Use:

```json
"abilitySelection": {
  "regular": ["overgrow"],
  "hidden": "chlorophyll"
}
```

`regular` contains one or two IDs. `hidden` is empty or one different ID.

An original ability requires `id`, `kind: "特性"`, `name`, `description`, and `source: "原创"`.

An original move additionally requires a valid `type` and `category` (`物理`, `特殊`, or `变化`). Include `power`, `accuracy`, and `pp` when known even if the current editor exposes only part of the metadata.

## Evolution and form relations

Supported method IDs include `Level`, `Happiness`, `Location`, `Beautiful`, `Item`, `Move`, `Movetype`, `Movetimes`, `Held`, `Trade`, `Pokémon`, `Affection`, `Critical`, `Spin`, `Damage`, `Hittimes`, `Letsgo`, `Other`, and `None`. Copy the required value keys and defaults from `evolution-methods.json`.

In form mode, set an existing base slug and both form fields. Evolution-condition fields may stay empty because the relation is a form rather than an evolution.

## Image handling

Do not embed a local file path in `image`; browsers cannot display it after import. Keep `image` empty in generated JSON, import the JSON, then upload the generated PNG through “形象设定”. If an existing export already contains a data URL, preserve it unless the user requests replacement.

## Example

```json
{
  "image": "",
  "name": "芽绒兽",
  "jaName": "",
  "enName": "",
  "category": "棉芽宝可梦",
  "types": ["草", "妖精"],
  "height": "0.6",
  "weight": "8.4",
  "description": "它会把清晨凝结的露水收进耳边的叶片，再分给巢穴附近的小型宝可梦。",
  "origin": "以种荚、棉絮和互惠共生为原型。",
  "artist": "",
  "relationshipMode": "evolution",
  "evolutionBase": "",
  "evolutionMethod": "",
  "evolutionDirection": "into-custom",
  "evolutionCondition": {"method": "None", "values": {}},
  "formCategory": "地区形态",
  "formLabel": "",
  "abilitySelection": {"regular": ["overgrow"], "hidden": ""},
  "selected": ["overgrow", "energy-ball"],
  "learnMethods": {"energy-ball": "28"},
  "custom": [],
  "stats": {"HP": 55, "攻击": 45, "防御": 60, "特攻": 70, "特防": 75, "速度": 45}
}
```
