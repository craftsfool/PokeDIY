#!/usr/bin/env python3
"""Build a locked PokeDIY flat-illustration prompt from a draft JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("draft", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--key-color", default="#ff00ff")
    parser.add_argument("--visual-brief", default="")
    args = parser.parse_args()

    draft = load_json(args.draft)
    profile_path = Path(__file__).resolve().parent.parent / "assets" / "art-style-profile.json"
    profile = load_json(profile_path)
    name = str(draft.get("name") or "未命名原创生物")
    types = "／".join(draft.get("types") or []) or "未设定"
    category = str(draft.get("category") or "未设定分类")
    description = str(draft.get("description") or "未提供生态描述")
    origin = str(draft.get("origin") or "未提供原型说明")
    visual_brief = args.visual_brief.strip() or "根据原型与生态描述提炼一个清晰、原创、易识别的轮廓；不要添加未声明的道具或服饰。"
    avoid = ", ".join(profile["avoid"])

    prompt = f"""Use case: stylized-concept
Asset type: PokeDIY encyclopedia portrait; style profile {profile['id']}
Primary request: Draw one completely original fantasy creature named {name}. Do not reference or resemble any existing character.
Concept: category {category}; types {types}; ecology: {description}; design origin: {origin}.
Subject geometry: {visual_brief}
Composition/framing: {profile['view']}.
Linework: {profile['linework']}.
Color system: {profile['color']}.
Shading: {profile['shading']}.
Scene/backdrop: {profile['background']}; use {args.key_color}; do not use that key color inside the creature.
Constraints: one creature only; readable silhouette at 128 px; simplified intentional joints and facial construction; original design only; no crop; no extra elements.
Avoid: {avoid}.
"""
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(prompt, encoding="utf-8")
    else:
        print(prompt, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
