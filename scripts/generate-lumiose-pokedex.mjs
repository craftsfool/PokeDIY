#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "data", "legends-za");

const SOURCES = {
  lumioseDex: "https://pokemondb.net/pokedex/game/legends-z-a",
  species:
    "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv",
  speciesNames:
    "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv",
};

const LANGUAGE_IDS = {
  ja: 11,
  "zh-Hant": 4,
  en: 9,
  "zh-Hans": 12,
};

const TYPE_NAMES_ZH_HANS = {
  normal: "一般",
  fire: "火",
  water: "水",
  electric: "电",
  grass: "草",
  ice: "冰",
  fighting: "格斗",
  poison: "毒",
  ground: "地面",
  flying: "飞行",
  psychic: "超能力",
  bug: "虫",
  rock: "岩石",
  ghost: "幽灵",
  dragon: "龙",
  dark: "恶",
  steel: "钢",
  fairy: "妖精",
};

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Pokemon-ZA-static-data-generator/1.0" },
  });

  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${url}`);
  }

  return response.text();
}

function parseSpeciesCsv(csv) {
  const rows = csv.trim().split(/\r?\n/).slice(1);
  return new Map(
    rows.map((line) => {
      const columns = line.split(",");
      return [
        columns[1],
        {
          nationalDex: Number(columns[0]),
          isLegendary: columns[16] === "1",
          isMythical: columns[17] === "1",
        },
      ];
    }),
  );
}

function parseSpeciesNamesCsv(csv) {
  const names = new Map();

  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [speciesIdText, languageIdText, name] = line.split(",", 3);
    const speciesId = Number(speciesIdText);
    const languageId = Number(languageIdText);
    const language = Object.entries(LANGUAGE_IDS).find(
      ([, id]) => id === languageId,
    )?.[0];

    if (!language) continue;

    const current = names.get(speciesId) ?? {};
    current[language] = name;
    names.set(speciesId, current);
  }

  return names;
}

function parseLumioseDexHtml(html) {
  const cards = html.match(/<div class="infocard ">.*?<\/div>/g) ?? [];

  return cards.map((card) => {
    const dexNumber = card.match(/<small>#(\d{3})<\/small>/)?.[1];
    const slug = card.match(/class="ent-name" href="\/pokedex\/([^"]+)"/)?.[1];
    const types = [...card.matchAll(/href="\/type\/([^"]+)"/g)].map(
      (match) => match[1],
    );

    if (!dexNumber || !slug || types.length === 0) {
      throw new Error(`无法解析图鉴卡片：${card.slice(0, 160)}`);
    }

    return { lumioseDex: Number(dexNumber), slug, types };
  });
}

function validate(entries) {
  if (entries.length !== 232) {
    throw new Error(`密阿雷图鉴应有 232 个条目，实际得到 ${entries.length} 个`);
  }

  entries.forEach((entry, index) => {
    const expected = index + 1;
    if (entry.lumioseDex !== expected) {
      throw new Error(
        `图鉴编号不连续：第 ${expected} 项实际为 #${entry.lumioseDex}`,
      );
    }

    if (!entry.names["zh-Hans"] || !entry.names.en) {
      throw new Error(`#${entry.lumioseDex} 缺少中英文名称`);
    }
  });
}

function toMarkdown(entries) {
  const rows = entries.map((entry) => {
    const tags = [
      entry.isStarterChoice ? "最初伙伴" : null,
      entry.isLegendary ? "传说" : null,
      entry.isMythical ? "幻之" : null,
      !entry.requiredForCompletion ? "活动追加/不计完成" : null,
    ]
      .filter(Boolean)
      .join("、");

    return `| ${String(entry.lumioseDex).padStart(3, "0")} | ${String(entry.nationalDex).padStart(4, "0")} | ${entry.names["zh-Hans"]} | ${entry.names.en} | ${entry.typesZhHans.join(" / ")} | ${tags} |`;
  });

  return [
    "# 《宝可梦传说 Z-A》密阿雷图鉴预存列表",
    "",
    "> 范围：主游戏密阿雷图鉴。#001–#230 为完成图鉴所需条目；#231 蒂安希与 #232 超梦为活动追加条目，不计入完成条件。DLC 超次元图鉴不包含在本文件中。",
    "",
    `共 ${entries.length} 个条目，其中 ${entries.filter((entry) => entry.requiredForCompletion).length} 个计入图鉴完成。`,
    "",
    "| 密阿雷 | 全国 | 中文名 | 英文名 | 属性 | 备注 |",
    "| ---: | ---: | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

async function main() {
  const [dexHtml, speciesCsv, speciesNamesCsv] = await Promise.all([
    fetchText(SOURCES.lumioseDex),
    fetchText(SOURCES.species),
    fetchText(SOURCES.speciesNames),
  ]);

  const speciesBySlug = parseSpeciesCsv(speciesCsv);
  const namesBySpeciesId = parseSpeciesNamesCsv(speciesNamesCsv);

  const entries = parseLumioseDexHtml(dexHtml).map((dexEntry) => {
    const species = speciesBySlug.get(dexEntry.slug);
    if (!species) throw new Error(`PokeAPI 中找不到物种：${dexEntry.slug}`);

    const names = namesBySpeciesId.get(species.nationalDex);
    if (!names) throw new Error(`PokeAPI 中找不到名称：${dexEntry.slug}`);

    return {
      lumioseDex: dexEntry.lumioseDex,
      nationalDex: species.nationalDex,
      slug: dexEntry.slug,
      names,
      types: dexEntry.types,
      typesZhHans: dexEntry.types.map((type) => TYPE_NAMES_ZH_HANS[type]),
      requiredForCompletion: dexEntry.lumioseDex <= 230,
      isStarterChoice: [1, 4, 7].includes(dexEntry.lumioseDex),
      isLegendary: species.isLegendary,
      isMythical: species.isMythical,
    };
  });

  validate(entries);

  const output = {
    schemaVersion: 1,
    game: "pokemon-legends-za",
    dex: "lumiose",
    scope: "base-game",
    generatedAt: new Date().toISOString().slice(0, 10),
    counts: {
      total: entries.length,
      requiredForCompletion: entries.filter(
        (entry) => entry.requiredForCompletion,
      ).length,
      optionalEventEntries: entries.filter(
        (entry) => !entry.requiredForCompletion,
      ).length,
    },
    sources: Object.values(SOURCES),
    entries,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(OUTPUT_DIR, "lumiose-pokedex.json"),
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(OUTPUT_DIR, "lumiose-pokedex.zh-CN.md"),
      toMarkdown(entries),
      "utf8",
    ),
  ]);

  console.log(
    `已生成 ${entries.length} 个密阿雷图鉴条目（${output.counts.requiredForCompletion} 个计入完成）。`,
  );
}

await main();

