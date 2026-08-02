#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "data", "national");
const SOURCE_PAGE = "https://wiki.52poke.com/wiki/宝可梦列表（按全国图鉴编号）";
const SOURCE_API = new URL("https://wiki.52poke.com/api.php");

SOURCE_API.search = new URLSearchParams({
  action: "parse",
  page: "宝可梦列表（按全国图鉴编号）",
  prop: "text|displaytitle|revid",
  format: "json",
  formatversion: "2",
}).toString();

const TYPE_NAMES = {
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

const TYPE_ALIASES = {
  惡: "恶",
  格鬥: "格斗",
  幽靈: "幽灵",
  蟲: "虫",
  鋼: "钢",
  電: "电",
  飛行: "飞行",
  龍: "龙",
};

const GENERATION_ENDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025];

function decodeHtml(value = "") {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
    const digits = radix === 16 ? code.slice(2) : code.slice(1);
    const point = Number.parseInt(digits, radix);
    return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
  });
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(fragment, name) {
  return decodeHtml(
    fragment.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"))?.[1] ??
      fragment.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"))?.[2] ??
      "",
  );
}

function getCell(row, className) {
  const cells = row.match(/<td\b[\s\S]*?<\/td>/gi) ?? [];
  return (
    cells.find((cell) =>
      getAttribute(cell.slice(0, cell.indexOf(">") + 1), "class")
        .split(/\s+/)
        .includes(className),
    ) ?? ""
  );
}

function getFirstAnchor(cell) {
  const anchor = cell.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
  return anchor
    ? { href: getAttribute(anchor[1], "href"), text: stripTags(anchor[2]) }
    : { href: "", text: "" };
}

function getFormLabel(cell) {
  return stripTags(cell.match(/<small\b[^>]*>([\s\S]*?)<\/small>/i)?.[1] ?? "");
}

function getSpriteKey(cell) {
  return cell.match(/\bsprite-icon-([\dA-Z-]+)\b/)?.[1] ?? null;
}

function toSlug(name, nationalDex, formLabel = "") {
  const base = name
    .normalize("NFKD")
    .replace(/♀/g, "-female")
    .replace(/♂/g, "-male")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const form = (formLabel ?? "")
    .replace(/阿罗拉/g, "alola")
    .replace(/伽勒尔/g, "galar")
    .replace(/洗翠/g, "hisui")
    .replace(/帕底亚/g, "paldea")
    .replace(/斗战种/g, "combat-breed")
    .replace(/火炽种/g, "blaze-breed")
    .replace(/水澜种/g, "aqua-breed")
    .replace(/的样子/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return [base || `pokemon-${nationalDex}`, form].filter(Boolean).join("-");
}

function getGeneration(nationalDex) {
  return GENERATION_ENDS.findIndex((end) => nationalDex <= end) + 1;
}

function parseRows(html) {
  const rows = html.match(/<tr\b[^>]*data-type=(?:"[^"]*"|'[^']*')[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  return rows.map((row, index) => {
    const openingTag = row.slice(0, row.indexOf(">") + 1);
    const idCell = getCell(row, "rdexn-id");
    const nameCell = getCell(row, "rdexn-name");
    const nameAnchor = getFirstAnchor(nameCell);
    const nationalDex = Number(stripTags(idCell).replace(/\D/g, ""));
    const formLabel = getFormLabel(nameCell) || null;
    const names = {
      "zh-Hans": nameAnchor.text,
      ja: stripTags(getCell(row, "rdexn-jpname")),
      en: stripTags(getCell(row, "rdexn-enname")),
    };
    const typesZhHans = getAttribute(openingTag, "data-type")
      .split(":")
      .map((type) => type.trim())
      .filter(Boolean);
    const normalizedTypesZhHans = typesZhHans.map((type) => TYPE_ALIASES[type] ?? type);

    if (!nationalDex || !names["zh-Hans"] || !names.en || typesZhHans.length === 0) {
      throw new Error(`无法解析第 ${index + 1} 个图鉴表格行：${stripTags(row).slice(0, 120)}`);
    }

    const wikiPath = nameAnchor.href;
    return {
      nationalDex,
      slug: toSlug(names.en, nationalDex, formLabel),
      names,
      formLabel,
      generation: getGeneration(nationalDex),
      types: normalizedTypesZhHans.map((type) => TYPE_NAMES[type] ?? type),
      typesZhHans: normalizedTypesZhHans,
      tags: getAttribute(openingTag, "data-filter").split("").filter(Boolean),
      spriteKey: getSpriteKey(getCell(row, "rdexn-msp")),
      wikiTitle: names["zh-Hans"],
      wikiPath,
      wikiUrl: new URL(wikiPath, "https://wiki.52poke.com").href,
    };
  });
}

function validate(entries, alternateForms) {
  if (entries.length !== 1025) {
    throw new Error(`全国图鉴应有 1025 个主条目，实际得到 ${entries.length} 个`);
  }

  entries.forEach((entry, index) => {
    const expected = index + 1;
    if (entry.nationalDex !== expected) {
      throw new Error(`图鉴编号不连续：第 ${expected} 项实际为 #${entry.nationalDex}`);
    }
    if (!entry.names["zh-Hans"] || !entry.names.ja || !entry.names.en) {
      throw new Error(`#${String(expected).padStart(4, "0")} 缺少中、日或英文名称`);
    }
    if (entry.types.some((type) => !Object.values(TYPE_NAMES).includes(type))) {
      throw new Error(`#${String(expected).padStart(4, "0")} 存在未知属性`);
    }
  });

  if (alternateForms.length !== 57) {
    throw new Error(`来源页面应有 57 个地区形态，实际得到 ${alternateForms.length} 个`);
  }
}

function toMarkdown(entries, alternateForms, revisionId) {
  const entryRows = entries.map(
    (entry) =>
      `| ${String(entry.nationalDex).padStart(4, "0")} | [${entry.names["zh-Hans"]}](${entry.wikiUrl}) | ${entry.names.ja} | ${entry.names.en} | ${entry.typesZhHans.join(" / ")} | ${entry.generation} |`,
  );
  const formRows = alternateForms.map(
    (entry) =>
      `| ${String(entry.nationalDex).padStart(4, "0")} | [${entry.names["zh-Hans"]}](${entry.wikiUrl}) | ${entry.formLabel} | ${entry.typesZhHans.join(" / ")} |`,
  );

  return [
    "# 全国图鉴结构化列表",
    "",
    `> 来源：[52Poké Wiki 全国图鉴编号列表](${SOURCE_PAGE})${revisionId ? `（修订版本 ${revisionId}）` : ""}。内容依照 CC BY-NC-SA 3.0 使用。`,
    "",
    `共 ${entries.length} 个主条目，另收录 ${alternateForms.length} 个地区形态。`,
    "",
    "| 全国编号 | 中文名 | 日文名 | 英文名 | 属性 | 世代 |",
    "| ---: | --- | --- | --- | --- | ---: |",
    ...entryRows,
    "",
    "## 地区形态",
    "",
    "| 全国编号 | 中文名 | 形态 | 属性 |",
    "| ---: | --- | --- | --- |",
    ...formRows,
    "",
  ].join("\n");
}

async function main() {
  const response = await fetch(SOURCE_API, {
    headers: {
      accept: "application/json",
      "user-agent": "PokeDIY-national-dex-generator/1.0 (https://wiki.52poke.com/)",
    },
  });
  if (!response.ok) throw new Error(`请求失败：${response.status} ${SOURCE_API}`);

  const payload = await response.json();
  if (payload.error) throw new Error(`MediaWiki API 错误：${payload.error.info}`);

  const allRows = parseRows(payload.parse.text);
  const entries = [];
  const alternateForms = [];
  const seen = new Set();

  for (const row of allRows) {
    if (!seen.has(row.nationalDex)) {
      seen.add(row.nationalDex);
      entries.push({ ...row, formLabel: null });
    } else {
      alternateForms.push(row);
    }
  }

  validate(entries, alternateForms);

  const output = {
    schemaVersion: 1,
    dex: "national",
    language: "zh-Hans",
    generatedAt: new Date().toISOString(),
    counts: {
      species: entries.length,
      alternateForms: alternateForms.length,
      sourceRows: allRows.length,
    },
    license: {
      name: "CC BY-NC-SA 3.0",
      url: "https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans",
      attribution: "52Poké Wiki contributors",
    },
    source: {
      title: payload.parse.title,
      pageId: payload.parse.pageid,
      revisionId: payload.parse.revid ?? null,
      pageUrl: SOURCE_PAGE,
      apiUrl: SOURCE_API.href,
    },
    entries,
    alternateForms,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(OUTPUT_DIR, "national-pokedex.json"),
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(OUTPUT_DIR, "national-pokedex.zh-CN.md"),
      toMarkdown(entries, alternateForms, payload.parse.revid),
      "utf8",
    ),
  ]);

  console.log(
    `已生成 ${entries.length} 个全国图鉴主条目及 ${alternateForms.length} 个地区形态（来源共 ${allRows.length} 行）。`,
  );
}

await main();
