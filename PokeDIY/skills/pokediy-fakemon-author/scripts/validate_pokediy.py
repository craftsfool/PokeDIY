#!/usr/bin/env python3
"""Validate a PokeDIY draft export using only the Python standard library."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

TYPES = {"一般", "火", "水", "电", "草", "冰", "格斗", "毒", "地面", "飞行", "超能力", "虫", "岩石", "幽灵", "龙", "恶", "钢", "妖精"}
STATS = ("HP", "攻击", "防御", "特攻", "特防", "速度")
CATEGORIES = {"物理", "特殊", "变化"}
RELATIONSHIP_MODES = {"evolution", "form"}
EVOLUTION_DIRECTIONS = {"into-custom", "from-custom"}
EVOLUTION_METHODS = {"", "Level", "Happiness", "Location", "Beautiful", "Item", "Move", "Movetype", "Movetimes", "Held", "Trade", "Pokémon", "Affection", "Critical", "Spin", "Damage", "Hittimes", "Letsgo", "Other", "None"}
FORM_CATEGORIES = {"地区形态", "特殊形态", "超级进化", "超极巨化", "原始回归", "战斗形态", "其他形态"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("draft", type=Path)
    args = parser.parse_args()
    try:
        data = json.loads(args.draft.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read JSON: {exc}")
        return 2

    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(data, dict):
        print("ERROR: root must be an object")
        return 2

    if not str(data.get("name", "")).strip():
        errors.append("name is required")
    types = data.get("types")
    if not isinstance(types, list) or not 1 <= len(types) <= 2:
        errors.append("types must contain one or two values")
    elif any(item not in TYPES for item in types):
        errors.append("types contains an unknown Simplified Chinese type")
    elif len(set(types)) != len(types):
        errors.append("types must not contain duplicates")

    stats = data.get("stats")
    if not isinstance(stats, dict) or set(stats) != set(STATS):
        errors.append("stats must contain exactly HP, 攻击, 防御, 特攻, 特防, 速度")
        total = 0
    else:
        values = []
        for key in STATS:
            value = stats[key]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not 1 <= value <= 255:
                errors.append(f"stats.{key} must be a number from 1 to 255")
            else:
                values.append(value)
        total = sum(values)
        if total > 600:
            warnings.append(f"base-stat total {total:g} is exceptional and needs explicit justification")
        elif total < 250:
            warnings.append(f"base-stat total {total:g} is unusually low")

    selected = data.get("selected", [])
    if not isinstance(selected, list) or any(not isinstance(item, str) for item in selected):
        errors.append("selected must be an array of resource IDs")
        selected_set: set[str] = set()
    else:
        selected_set = set(selected)
        if len(selected_set) != len(selected):
            errors.append("selected contains duplicate IDs")

    ability = data.get("abilitySelection", {})
    regular = ability.get("regular", []) if isinstance(ability, dict) else []
    hidden = ability.get("hidden", "") if isinstance(ability, dict) else ""
    if not isinstance(regular, list) or not 1 <= len(regular) <= 2 or any(not isinstance(item, str) for item in regular):
        errors.append("abilitySelection.regular must contain one or two IDs")
        regular = []
    if hidden is None:
        hidden = ""
    if not isinstance(hidden, str):
        errors.append("abilitySelection.hidden must be one ID or an empty string")
        hidden = ""
    if len(set(regular)) != len(regular) or hidden in regular:
        errors.append("ability IDs must be unique across regular and hidden roles")
    for resource_id in [*regular, *([hidden] if hidden else [])]:
        if resource_id not in selected_set:
            errors.append(f"ability {resource_id!r} is not present in selected")

    custom = data.get("custom", [])
    if not isinstance(custom, list):
        errors.append("custom must be an array")
        custom = []
    custom_ids: set[str] = set()
    for index, item in enumerate(custom):
        prefix = f"custom[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{prefix} must be an object")
            continue
        resource_id = item.get("id")
        if not isinstance(resource_id, str) or not resource_id.startswith("custom-"):
            errors.append(f"{prefix}.id must begin with custom-")
        elif resource_id in custom_ids:
            errors.append(f"duplicate custom ID {resource_id!r}")
        else:
            custom_ids.add(resource_id)
            if resource_id not in selected_set:
                errors.append(f"custom resource {resource_id!r} is not present in selected")
        if item.get("kind") not in {"特性", "招式"}:
            errors.append(f"{prefix}.kind must be 特性 or 招式")
        if not str(item.get("name", "")).strip() or not str(item.get("description", "")).strip():
            errors.append(f"{prefix} requires name and description")
        if item.get("source") != "原创":
            errors.append(f"{prefix}.source must be 原创")
        if item.get("kind") == "招式":
            if item.get("type") not in TYPES:
                errors.append(f"{prefix}.type is invalid")
            if item.get("category") not in CATEGORIES:
                errors.append(f"{prefix}.category is invalid")

    learn_methods = data.get("learnMethods", {})
    if not isinstance(learn_methods, dict):
        errors.append("learnMethods must be an object")
    else:
        for resource_id, raw in learn_methods.items():
            value = str(raw).strip()
            if value not in {"-", "进化"} and not (re.fullmatch(r"\d{1,3}", value) and 1 <= int(value) <= 100):
                errors.append(f"learnMethods.{resource_id} must be -, 进化, or level 1-100")
            if resource_id not in selected_set:
                warnings.append(f"learnMethods contains unselected resource {resource_id!r}")

    mode = data.get("relationshipMode", "evolution")
    if mode not in RELATIONSHIP_MODES:
        errors.append("relationshipMode must be evolution or form")
    if data.get("evolutionDirection", "into-custom") not in EVOLUTION_DIRECTIONS:
        errors.append("evolutionDirection must be into-custom or from-custom")
    condition = data.get("evolutionCondition", {})
    method = condition.get("method", "") if isinstance(condition, dict) else None
    if method not in EVOLUTION_METHODS:
        errors.append("evolutionCondition.method is unsupported")
    if mode == "form":
        if not str(data.get("evolutionBase", "")).strip():
            errors.append("form mode requires evolutionBase")
        if data.get("formCategory") not in FORM_CATEGORIES:
            errors.append("form mode requires a supported formCategory")
        if not str(data.get("formLabel", "")).strip():
            errors.append("form mode requires formLabel")

    image = data.get("image", "")
    if image and not (isinstance(image, str) and image.startswith("data:image/")):
        warnings.append("image is not a browser data URL; keep it empty and upload the PNG after import")

    for message in errors:
        print(f"ERROR: {message}")
    for message in warnings:
        print(f"WARNING: {message}")
    print(f"SUMMARY: {len(errors)} error(s), {len(warnings)} warning(s), BST={total:g}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
