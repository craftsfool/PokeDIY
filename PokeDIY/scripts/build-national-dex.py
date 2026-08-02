#!/usr/bin/env python3
"""Build the compact card-detail dataset used by the PokeDIY Pokédex.

The source tables are PokeAPI's versioned CSV exports. The generated file is
checked into data/national so the page stays fast and does not depend on a
third-party API at runtime.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
NATIONAL_PATH = ROOT / "data/national/national-pokedex.json"
OUTPUT_PATH = ROOT / "data/national/pokemon-card-details.json"
ARTWORK_DIR = ROOT / "data/assets/pokemon-art"
CSV_ROOT = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv"
ARTWORK_ROOT = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork"
ZH_HANS = "12"


def rows(name: str) -> list[dict[str, str]]:
    with urllib.request.urlopen(f"{CSV_ROOT}/{name}.csv", timeout=90) as response:
        text = response.read().decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(text)))


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\f", " ").replace("\n", " ")).strip()


def integer(value: str | None) -> int | None:
    return int(value) if value and value.isdigit() else None


def build_artwork() -> None:
    ARTWORK_DIR.mkdir(parents=True, exist_ok=True)

    def convert(national_dex: int) -> tuple[int, str]:
        target = ARTWORK_DIR / f"{national_dex}.webp"
        if target.exists() and target.stat().st_size > 1000:
            return national_dex, "cached"
        with urllib.request.urlopen(f"{ARTWORK_ROOT}/{national_dex}.png", timeout=45) as response:
            source = Image.open(io.BytesIO(response.read())).convert("RGBA")
        source.thumbnail((300, 300), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (300, 300), (255, 255, 255, 0))
        canvas.alpha_composite(source, ((300 - source.width) // 2, (300 - source.height) // 2))
        canvas.save(target, "WEBP", quality=82, method=4)
        return national_dex, "written"

    written = 0
    with ThreadPoolExecutor(max_workers=18) as executor:
        futures = [executor.submit(convert, national_dex) for national_dex in range(1, 1026)]
        for completed, future in enumerate(as_completed(futures), 1):
            _, state = future.result()
            written += state == "written"
            if completed % 100 == 0:
                print(f"Artwork {completed}/1025", flush=True)
    print(f"Artwork ready: {written} written, {1025 - written} cached in {ARTWORK_DIR}")


def main() -> None:
    national = json.loads(NATIONAL_PATH.read_text(encoding="utf-8"))
    chinese_by_id = {
        int(entry["nationalDex"]): entry["names"]["zh-Hans"]
        for entry in national["entries"]
    }

    pokemon = {int(row["id"]): row for row in rows("pokemon") if row["is_default"] == "1"}
    species_rows = {int(row["id"]): row for row in rows("pokemon_species")}

    stat_keys = {1: "HP", 2: "攻击", 3: "防御", 4: "特攻", 5: "特防", 6: "速度"}
    stats: dict[int, dict[str, int]] = {}
    for row in rows("pokemon_stats"):
        pokemon_id = int(row["pokemon_id"])
        stat_id = int(row["stat_id"])
        if pokemon_id in pokemon and stat_id in stat_keys:
            stats.setdefault(pokemon_id, {})[stat_keys[stat_id]] = int(row["base_stat"])

    ability_names = {
        int(row["ability_id"]): row["name"]
        for row in rows("ability_names")
        if row["local_language_id"] == ZH_HANS
    }
    abilities: dict[int, list[dict[str, object]]] = {}
    for row in rows("pokemon_abilities"):
        pokemon_id = int(row["pokemon_id"])
        ability_id = int(row["ability_id"])
        name = ability_names.get(ability_id)
        if pokemon_id in pokemon and name:
            abilities.setdefault(pokemon_id, []).append(
                {
                    "name": name,
                    "hidden": row["is_hidden"] == "1",
                    "slot": int(row["slot"]),
                }
            )
    for values in abilities.values():
        values.sort(key=lambda item: (bool(item["hidden"]), int(item["slot"])))

    descriptions: dict[int, tuple[int, str]] = {}
    for row in rows("pokemon_species_flavor_text"):
        if row["language_id"] != ZH_HANS:
            continue
        species_id = int(row["species_id"])
        version_id = int(row["version_id"])
        current = descriptions.get(species_id)
        if current is None or version_id >= current[0]:
            descriptions[species_id] = (version_id, clean_text(row["flavor_text"]))

    item_names = {
        int(row["item_id"]): row["name"]
        for row in rows("item_names")
        if row["local_language_id"] == ZH_HANS
    }
    move_names = {
        int(row["move_id"]): row["name"]
        for row in rows("move_names")
        if row["local_language_id"] == ZH_HANS
    }
    evolution_rows: dict[int, list[dict[str, str]]] = {}
    for row in rows("pokemon_evolution"):
        evolution_rows.setdefault(int(row["evolved_species_id"]), []).append(row)

    def evolution_method(species_id: int) -> str:
        candidates = evolution_rows.get(species_id, [])
        if not candidates:
            return "进化"
        row = next((value for value in candidates if value["is_default"] == "1"), candidates[0])
        conditions: list[str] = []
        if row["minimum_level"]:
            conditions.append(f"Lv.{row['minimum_level']}")
        if row["trigger_item_id"]:
            conditions.append(item_names.get(int(row["trigger_item_id"]), "使用道具"))
        if row["held_item_id"]:
            conditions.append(f"携带{item_names.get(int(row['held_item_id']), '指定道具')}")
        if row["known_move_id"]:
            conditions.append(f"学会{move_names.get(int(row['known_move_id']), '指定招式')}")
        if row["minimum_happiness"]:
            conditions.append("高亲密度")
        if row["time_of_day"]:
            conditions.append("白天" if row["time_of_day"] == "day" else "夜晚")
        if row["location_id"]:
            conditions.append("指定地点")
        if row["needs_overworld_rain"] == "1":
            conditions.append("下雨时")
        if row["turn_upside_down"] == "1":
            conditions.append("倒置主机")
        trigger_id = integer(row["evolution_trigger_id"])
        if trigger_id == 2:
            conditions.insert(0, "连接交换")
        elif trigger_id == 3 and not row["trigger_item_id"]:
            conditions.insert(0, "使用道具")
        return " · ".join(dict.fromkeys(conditions)) or "提升等级"

    children: dict[int, list[int]] = {}
    for species_id, row in species_rows.items():
        parent = integer(row["evolves_from_species_id"])
        if parent:
            children.setdefault(parent, []).append(species_id)

    entries: dict[str, dict[str, object]] = {}
    for species_id in range(1, 1026):
        species = species_rows.get(species_id, {})
        pokemon_row = pokemon.get(species_id, {})
        previous_id = integer(species.get("evolves_from_species_id"))
        next_ids = children.get(species_id, [])
        values = stats.get(species_id, {})
        entries[str(species_id)] = {
            "height": integer(pokemon_row.get("height")),
            "weight": integer(pokemon_row.get("weight")),
            "description": descriptions.get(species_id, (0, "暂无图鉴说明。"))[1],
            "abilities": abilities.get(species_id, []),
            "stats": values,
            "statTotal": sum(values.values()),
            "evolution": {
                "previous": (
                    {
                        "nationalDex": previous_id,
                        "name": chinese_by_id.get(previous_id, f"#{previous_id:04d}"),
                        "method": evolution_method(species_id),
                    }
                    if previous_id
                    else None
                ),
                "next": [
                    {
                        "nationalDex": child_id,
                        "name": chinese_by_id.get(child_id, f"#{child_id:04d}"),
                        "method": evolution_method(child_id),
                    }
                    for child_id in next_ids
                ],
            },
        }

    output = {
        "version": 1,
        "source": "PokeAPI/pokeapi CSV data exports",
        "sourceUrl": "https://github.com/PokeAPI/pokeapi",
        "artworkUrlTemplate": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{nationalDex}.png",
        "entries": entries,
    }
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(entries)} Pokédex card records to {OUTPUT_PATH}")
    if "--with-artwork" in sys.argv:
        build_artwork()


if __name__ == "__main__":
    main()
