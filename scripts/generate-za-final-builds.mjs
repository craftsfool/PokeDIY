#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "data", "legends-za");
const DEX_FILE = path.join(OUTPUT_DIR, "lumiose-pokedex.json");

const POKEAPI_CSV =
  "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const SITE_API = "https://poke.xinlao.com/pokemon/api.php";

const SOURCES = {
  species: `${POKEAPI_CSV}/pokemon_species.csv`,
  pokemon: `${POKEAPI_CSV}/pokemon.csv`,
  pokemonStats: `${POKEAPI_CSV}/pokemon_stats.csv`,
  pokemonTypes: `${POKEAPI_CSV}/pokemon_types.csv`,
  moves: `${POKEAPI_CSV}/moves.csv`,
  moveNames: `${POKEAPI_CSV}/move_names.csv`,
  types: `${POKEAPI_CSV}/types.csv`,
  stats: `${POKEAPI_CSV}/stats.csv`,
  zaItems: `${SITE_API}?action=get_all_items_list&version=gen9a&lang=zh-CN`,
};

const NATURES = {
  adamant: { en: "Adamant", zhHans: "固执" },
  jolly: { en: "Jolly", zhHans: "爽朗" },
  brave: { en: "Brave", zhHans: "勇敢" },
  modest: { en: "Modest", zhHans: "内敛" },
  timid: { en: "Timid", zhHans: "胆小" },
  quiet: { en: "Quiet", zhHans: "冷静" },
  impish: { en: "Impish", zhHans: "淘气" },
  bold: { en: "Bold", zhHans: "大胆" },
  careful: { en: "Careful", zhHans: "慎重" },
  calm: { en: "Calm", zhHans: "温和" },
};

const TYPE_ZH_TO_EN = {
  一般: "normal",
  火: "fire",
  水: "water",
  电: "electric",
  草: "grass",
  冰: "ice",
  格斗: "fighting",
  毒: "poison",
  地面: "ground",
  飞行: "flying",
  超能力: "psychic",
  虫: "bug",
  岩石: "rock",
  幽灵: "ghost",
  龙: "dragon",
  恶: "dark",
  钢: "steel",
  妖精: "fairy",
};

const PHYSICAL_SETUP = [
  "Swords Dance",
  "Dragon Dance",
  "Bulk Up",
  "Coil",
  "Hone Claws",
  "Curse",
  "Belly Drum",
  "Victory Dance",
  "Shift Gear",
  "Work Up",
];
const SPECIAL_SETUP = [
  "Nasty Plot",
  "Calm Mind",
  "Quiver Dance",
  "Geomancy",
  "Tail Glow",
  "Charge Beam",
  "Work Up",
];
const RECOVERY = [
  "Recover",
  "Roost",
  "Synthesis",
  "Moonlight",
  "Morning Sun",
  "Slack Off",
  "Shore Up",
  "Wish",
  "Rest",
  "Leech Seed",
  "Strength Sap",
  "Jungle Healing",
  "Life Dew",
];
const SUPPORT = [
  "Will-O-Wisp",
  "Thunder Wave",
  "Toxic",
  "Leech Seed",
  "Stealth Rock",
  "Spikes",
  "Toxic Spikes",
  "Reflect",
  "Light Screen",
  "Taunt",
  "Encore",
  "Substitute",
  "Protect",
  "Haze",
  "Safeguard",
  "Trick Room",
  "Tailwind",
  "Yawn",
  "Charm",
  "Confuse Ray",
  "Disable",
  "Destiny Bond",
  "Parting Shot",
  "Memento",
  "Aromatherapy",
  "Heal Bell",
  "Defog",
];
const MOVE_PENALTIES = new Map([
  ["Hyper Beam", 75],
  ["Giga Impact", 75],
  ["Frenzy Plant", 75],
  ["Blast Burn", 75],
  ["Hydro Cannon", 75],
  ["Self-Destruct", 90],
  ["Explosion", 90],
  ["Take Down", 20],
  ["Double-Edge", 12],
  ["Wild Charge", 12],
  ["Flare Blitz", 12],
  ["Head Smash", 18],
  ["Solar Beam", 18],
  ["Solar Blade", 18],
]);

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Pokemon-ZA-final-build-generator/1.0" },
  });
  if (!response.ok) throw new Error(`请求失败 ${response.status}: ${url}`);
  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function mapConcurrent(values, limit, mapper) {
  const result = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      result[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return result;
}

function pickRankedName(moves, names, excluded = new Set()) {
  for (const name of names) {
    const move = moves.find((candidate) => candidate.nameEn === name);
    if (move && !excluded.has(move.nameEn)) return move;
  }
  return null;
}

function attackScore(move, ownTypes, preferStab, avoided) {
  const accuracy = move.accuracy || 100;
  let score = (move.power || 0) * (accuracy / 100);
  const stab = ownTypes.includes(move.type);
  if (stab) score += preferStab ? 70 : 28;
  if (!stab && !preferStab) score += 15;
  if (move.priority > 0) score += 12;
  score -= MOVE_PENALTIES.get(move.nameEn) || 0;
  if (avoided.has(move.nameEn)) score -= 55;
  return score;
}

function rankedAttacks(moves, category, ownTypes, preferStab, avoided) {
  return moves
    .filter((move) => move.category === category && move.power > 0)
    .sort(
      (left, right) =>
        attackScore(right, ownTypes, preferStab, avoided) -
        attackScore(left, ownTypes, preferStab, avoided),
    );
}

function pushUnique(selected, move) {
  if (move && !selected.some((candidate) => candidate.nameEn === move.nameEn)) {
    selected.push(move);
  }
}

function fillMoves(selected, candidates, count = 4) {
  for (const move of candidates) {
    if (selected.length >= count) break;
    pushUnique(selected, move);
  }
  return selected.slice(0, count);
}

function buildOffenseMoves(moves, category, ownTypes, avoided = new Set()) {
  const selected = [];
  const setupNames = category === "physical" ? PHYSICAL_SETUP : SPECIAL_SETUP;
  pushUnique(selected, pickRankedName(moves, setupNames, avoided));

  for (const type of ownTypes) {
    const stab = rankedAttacks(moves, category, ownTypes, true, avoided).find(
      (move) => move.type === type,
    );
    pushUnique(selected, stab);
  }

  fillMoves(
    selected,
    rankedAttacks(moves, category, ownTypes, false, avoided).filter(
      (move) => !ownTypes.includes(move.type),
    ),
  );
  fillMoves(selected, rankedAttacks(moves, category, ownTypes, true, avoided));

  if (selected.length < 4) {
    fillMoves(
      selected,
      moves.filter((move) => move.category === "status" && !avoided.has(move.nameEn)),
    );
  }
  if (selected.length < 4) fillMoves(selected, moves);
  return selected.slice(0, 4);
}

function buildSupportMoves(moves, primaryCategory, ownTypes, avoided) {
  const selected = [];
  pushUnique(selected, pickRankedName(moves, RECOVERY, avoided));
  pushUnique(selected, pickRankedName(moves, SUPPORT, avoided));

  const preferredStab = rankedAttacks(
    moves,
    primaryCategory,
    ownTypes,
    true,
    avoided,
  ).find((move) => ownTypes.includes(move.type));
  pushUnique(selected, preferredStab);

  pushUnique(
    selected,
    pickRankedName(
      moves,
      [...SUPPORT, ...RECOVERY],
      new Set([...avoided, ...selected.map((move) => move.nameEn)]),
    ),
  );
  fillMoves(
    selected,
    rankedAttacks(moves, primaryCategory, ownTypes, false, avoided),
  );
  fillMoves(
    selected,
    moves.filter((move) => move.category === "status" && !avoided.has(move.nameEn)),
  );
  fillMoves(selected, moves.filter((move) => !avoided.has(move.nameEn)));
  fillMoves(selected, moves);
  return selected.slice(0, 4);
}

function reduceMoveOverlap(normalMoves, shinyMoves, allMoves) {
  const normalNames = new Set(normalMoves.map((move) => move.nameEn));
  let overlap = shinyMoves.filter((move) => normalNames.has(move.nameEn)).length;

  for (let index = shinyMoves.length - 1; index >= 0 && overlap > 2; index -= 1) {
    if (!normalNames.has(shinyMoves[index].nameEn)) continue;
    const replacement = allMoves.find(
      (move) =>
        !normalNames.has(move.nameEn) &&
        !shinyMoves.some((selected) => selected.nameEn === move.nameEn),
    );
    if (replacement) {
      shinyMoves[index] = replacement;
      overlap -= 1;
    }
  }

  return shinyMoves;
}

function offenseProfile(category, stats) {
  const fast = stats.speed >= 75;
  if (category === "physical") {
    return {
      role: fast ? "物攻速攻" : "物攻耐久",
      nature: fast ? NATURES.jolly : stats.speed < 50 ? NATURES.brave : NATURES.adamant,
      evs: fast
        ? { hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 }
        : { hp: 252, attack: 252, defense: 0, specialAttack: 0, specialDefense: 4, speed: 0 },
    };
  }
  return {
    role: fast ? "特攻速攻" : "特攻耐久",
    nature: fast ? NATURES.timid : stats.speed < 50 ? NATURES.quiet : NATURES.modest,
    evs: fast
      ? { hp: 4, attack: 0, defense: 0, specialAttack: 252, specialDefense: 0, speed: 252 }
      : { hp: 252, attack: 0, defense: 0, specialAttack: 252, specialDefense: 4, speed: 0 },
  };
}

function supportProfile(primaryCategory, stats) {
  const physicalWall = stats.defense <= stats.specialDefense;
  const physicalAttacker = primaryCategory === "physical";
  return {
    role: physicalWall ? "物理受向干扰" : "特殊受向干扰",
    nature: physicalWall
      ? physicalAttacker
        ? NATURES.impish
        : NATURES.bold
      : physicalAttacker
        ? NATURES.careful
        : NATURES.calm,
    evs: physicalWall
      ? { hp: 252, attack: 0, defense: 252, specialAttack: 0, specialDefense: 4, speed: 0 }
      : { hp: 252, attack: 0, defense: 4, specialAttack: 0, specialDefense: 252, speed: 0 },
  };
}

function evText(evs) {
  const labels = [
    ["hp", "HP"],
    ["attack", "Atk"],
    ["defense", "Def"],
    ["specialAttack", "SpA"],
    ["specialDefense", "SpD"],
    ["speed", "Spe"],
  ];
  return labels
    .filter(([key]) => evs[key] > 0)
    .map(([key, label]) => `${evs[key]} ${label}`)
    .join(" / ");
}

function genderPlan(genderRate) {
  if (genderRate === -1) {
    return { normal: null, shiny: null, constraint: "genderless" };
  }
  if (genderRate === 0) {
    return { normal: "M", shiny: "M", constraint: "male-only" };
  }
  if (genderRate === 8) {
    return { normal: "F", shiny: "F", constraint: "female-only" };
  }
  return { normal: "M", shiny: "F", constraint: "both" };
}

function chooseItem(role, stones, stats, allItems, excludedName = "") {
  const preferredSuffix = role.includes("物攻") ? " X" : " Y";
  const stone =
    stones.find(
      (candidate) => candidate.nameEn.endsWith(preferredSuffix) && candidate.nameEn !== excludedName,
    ) || stones.find((candidate) => candidate.nameEn !== excludedName);
  if (stone) return stone;

  let nameEn;
  if (role.includes("干扰")) {
    nameEn = "Rocky Helmet";
  } else if (role.includes("物攻")) {
    nameEn = stats.speed >= 100 ? "Focus Sash" : "Muscle Band";
  } else {
    nameEn = stats.speed >= 100 ? "Focus Sash" : "Wise Glasses";
  }

  if (nameEn === excludedName) {
    nameEn = role.includes("干扰") ? "Leftovers" : "Life Orb";
  }
  return allItems.find((item) => item.nameEn === nameEn) || { nameEn, name: nameEn };
}

function normalizeMove(form, index, moveMetaByName) {
  const nameEn = form.MoveEn[index];
  const rawZh = form.MoveCh[index] || form.Move[index] || nameEn;
  const match = rawZh.match(/^\[([^\]]+)\]\s*(.*)$/);
  const meta = moveMetaByName.get(nameEn);
  return {
    nameEn,
    nameZhHans: match?.[2] || rawZh,
    type: meta?.type || TYPE_ZH_TO_EN[match?.[1]] || "unknown",
    category: meta?.category || "status",
    power: meta?.power || 0,
    accuracy: meta?.accuracy || 100,
    priority: meta?.priority || 0,
  };
}

function buildPair(species, context) {
  const {
    stats,
    types,
    genderRate,
    form,
    moveMetaByName,
    items,
  } = context;
  const moves = form.MoveEn.map((_, index) => normalizeMove(form, index, moveMetaByName))
    .filter((move, index, list) => list.findIndex((item) => item.nameEn === move.nameEn) === index);

  const primaryCategory = stats.attack >= stats.specialAttack ? "physical" : "special";
  const secondaryCategory = primaryCategory === "physical" ? "special" : "physical";
  const primaryStat = primaryCategory === "physical" ? stats.attack : stats.specialAttack;
  const secondaryStat = secondaryCategory === "physical" ? stats.attack : stats.specialAttack;
  const secondaryViable = secondaryStat >= 70 && secondaryStat >= primaryStat * 0.68;

  const normalProfile = offenseProfile(primaryCategory, stats);
  const normalMoves = buildOffenseMoves(moves, primaryCategory, types);
  const avoided = new Set(normalMoves.map((move) => move.nameEn));

  const shinyProfile = secondaryViable
    ? offenseProfile(secondaryCategory, stats)
    : supportProfile(primaryCategory, stats);
  let shinyMoves = secondaryViable
    ? buildOffenseMoves(moves, secondaryCategory, types, avoided)
    : buildSupportMoves(moves, primaryCategory, types, avoided);
  shinyMoves = reduceMoveOverlap(normalMoves, shinyMoves, moves);

  const stones = items.filter(
    (item) => item.type === "MegaStones" && item.name.includes(species.names["zh-Hans"]),
  );
  const normalItem = chooseItem(normalProfile.role, stones, stats, items);
  const shinyItem = chooseItem(shinyProfile.role, stones, stats, items, normalItem.nameEn);
  const genders = genderPlan(genderRate);

  const common = {
    lumioseDex: species.lumioseDex,
    nationalDex: species.nationalDex,
    slug: species.slug,
    names: species.names,
    types,
    stats,
    genderConstraint: genders.constraint,
  };

  return [
    {
      ...common,
      variant: "normal",
      shiny: false,
      gender: genders.normal,
      role: normalProfile.role,
      nature: normalProfile.nature,
      item: normalItem,
      evs: normalProfile.evs,
      moves: normalMoves,
    },
    {
      ...common,
      variant: "shiny",
      shiny: true,
      gender: genders.shiny,
      role: shinyProfile.role,
      nature: shinyProfile.nature,
      item: shinyItem,
      evs: shinyProfile.evs,
      moves: shinyMoves,
    },
  ];
}

function validateBuilds(finalSpecies, builds, items) {
  const availableItems = new Set(items.map((item) => item.nameEn));
  if (finalSpecies.length !== 115) {
    throw new Error(`最终形态物种应为 115，实际为 ${finalSpecies.length}`);
  }
  if (builds.length !== 230) {
    throw new Error(`构建应为 230 条，实际为 ${builds.length}`);
  }

  for (const species of finalSpecies) {
    const pair = builds.filter((build) => build.nationalDex === species.nationalDex);
    if (pair.length !== 2) throw new Error(`${species.names.en} 并非两套构建`);
    const [normal, shiny] = pair;
    for (const build of pair) {
      if (build.moves.length !== 4) throw new Error(`${build.names.en} 招式不足 4 个`);
      if (new Set(build.moves.map((move) => move.nameEn)).size !== 4) {
        throw new Error(`${build.names.en} 存在重复招式`);
      }
      const evTotal = Object.values(build.evs).reduce((sum, value) => sum + value, 0);
      if (evTotal !== 508) throw new Error(`${build.names.en} 努力值总和为 ${evTotal}`);
      if (!build.item?.nameEn) throw new Error(`${build.names.en} 缺少道具`);
      if (!availableItems.has(build.item.nameEn)) {
        throw new Error(`${build.names.en} 的道具 ${build.item.nameEn} 不在 Z-A 道具表中`);
      }
    }
    if (normal.shiny || !shiny.shiny) throw new Error(`${species.names.en} 色违标记错误`);
    if (normal.role === shiny.role) throw new Error(`${species.names.en} 两套定位相同`);
    if (normal.nature.en === shiny.nature.en) throw new Error(`${species.names.en} 两套性格相同`);
    if (normal.item.nameEn === shiny.item.nameEn) throw new Error(`${species.names.en} 两套道具相同`);
    if (normal.genderConstraint === "both" && (normal.gender !== "M" || shiny.gender !== "F")) {
      throw new Error(`${species.names.en} 性别分配错误`);
    }
  }
}

function commandFor(build) {
  const gender = build.gender ? ` (${build.gender})` : "";
  const firstLine = `${build.names.en}${gender} @ ${build.item.nameEn}`;
  return [
    firstLine,
    "Level: 100",
    build.shiny ? "Shiny: Yes" : null,
    ".Version=52",
    `.Nature=${build.nature.en}`,
    `EVs: ${evText(build.evs)}`,
    "OT: 完颜亮",
    "TID: 640840",
    "Language: ChineseS",
    ...build.moves.map((move) => `-${move.nameEn}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function addressBarScript(builds) {
  const compact = builds.map((build) => [
    build.names.en,
    build.gender || "",
    build.item.nameEn,
    build.nature.en,
    evText(build.evs),
    build.moves.map((move) => move.nameEn),
    build.shiny ? 1 : 0,
  ]);

  return `javascript:(()=>{try{const d=${JSON.stringify(compact)};const m=window.CommandManager;if(!m)throw new Error("页面尚未加载完成，或当前不是gen9a宝可梦小助手页面");if(m.batchList.length&&!confirm(\`当前已有\${m.batchList.length}条数据，是否清空并写入230条？\`))return;m.batchList=d.map(x=>{const[n,g,i,t,e,v,s]=x;return[n+(g?\` (\${g})\`:"")+\` @ \${i}\`,"Level: 100",s?"Shiny: Yes":null,".Version=52",\`.Nature=\${t}\`,\`EVs: \${e}\`,"OT: 完颜亮","TID: 640840","Language: ChineseS",...v.map(a=>\`-\${a}\`)].filter(Boolean).join("\\n")});const c=document.getElementById("batch-count");if(c)c.textContent=String(m.batchList.length);const n=document.getElementById("trainer-name"),t=document.getElementById("trainer-tid"),h=document.getElementById("home-transfer-checkbox"),w=document.getElementById("home-transfer-switch");if(n)n.value="完颜亮";if(t)t.value="640840";if(h)h.checked=true;if(w)w.dataset.state="checked";if(typeof Pokemon!=="undefined")Pokemon.state.homeTransferEnabled=true;alert("写入完成：115种最终形态，原色与闪光各一只，共230条。") }catch(e){console.error(e);alert(\`写入失败：\${e.message}\`)}})();`;
}

function markdownFor(builds) {
  const rows = builds.map((build) => {
    const color = build.shiny ? "闪光" : "原色";
    const gender = build.gender === "M" ? "雄" : build.gender === "F" ? "雌" : "无性别";
    return `| ${String(build.lumioseDex).padStart(3, "0")} | ${build.names["zh-Hans"]} | ${color} | ${gender} | ${build.role} | ${build.nature.zhHans} | ${evText(build.evs)} | ${build.item.name} | ${build.moves.map((move) => move.nameZhHans).join(" / ")} |`;
  });

  return [
    "# 《宝可梦传说 Z-A》最终形态双配装",
    "",
    "> 范围：密阿雷图鉴所有最终进化或无进化物种，包含活动追加的蒂安希和超梦。每种各含原色与闪光两套不同玩法。可双性别物种统一为原色雄性、闪光雌性；单一性别与无性别物种遵循游戏限制。",
    "",
    "| 密阿雷 | 宝可梦 | 色违 | 性别 | 定位 | 性格 | 努力值 | 道具 | 招式 |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

async function main() {
  const dex = JSON.parse(await readFile(DEX_FILE, "utf8"));
  const sourceEntries = await Promise.all(
    Object.entries(SOURCES).map(async ([key, url]) => [key, await fetchText(url)]),
  );
  const sourceText = Object.fromEntries(sourceEntries);

  const speciesRows = parseCsv(sourceText.species);
  const pokemonRows = parseCsv(sourceText.pokemon);
  const pokemonStatRows = parseCsv(sourceText.pokemonStats);
  const pokemonTypeRows = parseCsv(sourceText.pokemonTypes);
  const moveRows = parseCsv(sourceText.moves);
  const moveNameRows = parseCsv(sourceText.moveNames);
  const typeRows = parseCsv(sourceText.types);
  const statRows = parseCsv(sourceText.stats);
  const itemsResult = JSON.parse(sourceText.zaItems);
  const items = itemsResult.data;

  const children = new Set(
    speciesRows.filter((row) => row.evolves_from_species_id).map((row) => Number(row.evolves_from_species_id)),
  );
  const finalSpecies = dex.entries.filter((entry) => !children.has(entry.nationalDex));

  const speciesById = new Map(speciesRows.map((row) => [Number(row.id), row]));
  const defaultPokemonBySpecies = new Map(
    pokemonRows
      .filter((row) => row.is_default === "1")
      .map((row) => [Number(row.species_id), Number(row.id)]),
  );
  const typeById = new Map(typeRows.map((row) => [Number(row.id), row.identifier]));
  const statById = new Map(statRows.map((row) => [Number(row.id), row.identifier]));

  const statsByPokemon = new Map();
  for (const row of pokemonStatRows) {
    const pokemonId = Number(row.pokemon_id);
    const stats = statsByPokemon.get(pokemonId) || {};
    stats[statById.get(Number(row.stat_id))] = Number(row.base_stat);
    statsByPokemon.set(pokemonId, stats);
  }
  const typesByPokemon = new Map();
  for (const row of pokemonTypeRows) {
    const pokemonId = Number(row.pokemon_id);
    const types = typesByPokemon.get(pokemonId) || [];
    types.push({ slot: Number(row.slot), type: typeById.get(Number(row.type_id)) });
    typesByPokemon.set(pokemonId, types);
  }

  const englishMoveNameById = new Map(
    moveNameRows
      .filter((row) => row.local_language_id === "9")
      .map((row) => [Number(row.move_id), row.name]),
  );
  const moveMetaByName = new Map();
  for (const row of moveRows) {
    const name = englishMoveNameById.get(Number(row.id));
    if (!name) continue;
    moveMetaByName.set(name, {
      type: typeById.get(Number(row.type_id)),
      category:
        row.damage_class_id === "2"
          ? "physical"
          : row.damage_class_id === "3"
            ? "special"
            : "status",
      power: Number(row.power) || 0,
      accuracy: Number(row.accuracy) || 100,
      priority: Number(row.priority) || 0,
    });
  }

  const forms = await mapConcurrent(finalSpecies, 10, async (species) => {
    const result = await fetchJson(
      `${SITE_API}?action=get_forms_list&sp_number=${species.nationalDex}&version=gen9a&lang=zh-CN`,
    );
    if (!result.success || !result.data?.length) {
      throw new Error(`${species.names.en} 缺少 Z-A 形态数据`);
    }
    return result.data[0];
  });

  const builds = finalSpecies.flatMap((species, index) => {
    const pokemonId = defaultPokemonBySpecies.get(species.nationalDex);
    const rawStats = statsByPokemon.get(pokemonId);
    const stats = {
      hp: rawStats.hp,
      attack: rawStats.attack,
      defense: rawStats.defense,
      specialAttack: rawStats["special-attack"],
      specialDefense: rawStats["special-defense"],
      speed: rawStats.speed,
    };
    const types = (typesByPokemon.get(pokemonId) || [])
      .sort((left, right) => left.slot - right.slot)
      .map((entry) => entry.type);
    const genderRate = Number(speciesById.get(species.nationalDex).gender_rate);
    return buildPair(species, {
      stats,
      types,
      genderRate,
      form: forms[index],
      moveMetaByName,
      items,
    });
  });

  validateBuilds(finalSpecies, builds, items);

  const output = {
    schemaVersion: 1,
    game: "pokemon-legends-za",
    scope: "lumiose-final-species-including-event",
    generatedAt: new Date().toISOString().slice(0, 10),
    trainer: { name: "完颜亮", id: "640840" },
    counts: { species: finalSpecies.length, builds: builds.length },
    sources: Object.values(SOURCES),
    builds,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(OUTPUT_DIR, "final-evolution-builds.json"),
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(OUTPUT_DIR, "final-evolution-builds.zh-CN.md"),
      markdownFor(builds),
      "utf8",
    ),
    writeFile(
      path.join(ROOT, "scripts", "za-final-builds-address-bar.txt"),
      `${addressBarScript(builds)}\n`,
      "utf8",
    ),
  ]);

  console.log(`已生成 ${finalSpecies.length} 种最终形态、${builds.length} 套配装。`);
}

await main();
