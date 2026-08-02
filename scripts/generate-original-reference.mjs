#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "data", "reference");
const WIKI_ORIGIN = "https://wiki.52poke.com";
const PAGES = {
  moves: "招式列表",
  abilities: "特性列表",
};
const SOURCE_URLS = Object.fromEntries(
  Object.entries(PAGES).map(([key, title]) => [key, `${WIKI_ORIGIN}/wiki/${encodeURIComponent(title)}`]),
);

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
const CATEGORY_ALIASES = { 物理: "物理", 特殊: "特殊", 变化: "变化", 變化: "变化" };
const GENERATION_NUMBERS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function decodeHtml(value = "") {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
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
  const match = fragment.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? "");
}

function getCells(row) {
  return row.match(/<td\b[\s\S]*?<\/td>/gi) ?? [];
}

function getFirstAnchor(cell) {
  const anchors = [...cell.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const anchor = anchors.find((candidate) => stripTags(candidate[2])) ?? anchors[0];
  return anchor
    ? { href: getAttribute(anchor[1], "href"), text: stripTags(anchor[2]) }
    : { href: "", text: stripTags(cell) };
}

function toSlug(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toWikiUrl(href) {
  return new URL(href, WIKI_ORIGIN).href;
}

function parseNumeric(display) {
  return /^\d+$/.test(display) ? Number(display) : null;
}

function getGenerationMarkers(html, kind) {
  const suffix = kind === "abilities" ? "引入特性" : "";
  const pattern = new RegExp(
    `<span class="mw-headline" id="第([一二三四五六七八九])世代${suffix}">`,
    "g",
  );
  return [...html.matchAll(pattern)].map((match) => ({
    index: match.index,
    generation: GENERATION_NUMBERS[match[1]],
  }));
}

function getGeneration(markers, rowIndex) {
  return markers.findLast((marker) => marker.index < rowIndex)?.generation ?? null;
}

function parseMoves(html) {
  const markers = getGenerationMarkers(html, "moves");
  const matches = [...html.matchAll(/<tr\b[^>]*data-type=(?:"[^"]*"|'[^']*')[^>]*>[\s\S]*?<\/tr>/gi)];

  const entries = matches.map((match, index) => {
    const row = match[0];
    const openingTag = row.slice(0, row.indexOf(">") + 1);
    const cells = getCells(row);
    if (cells.length !== 10) {
      throw new Error(`第 ${index + 1} 个招式表格行应有 10 列，实际为 ${cells.length} 列`);
    }

    const nameAnchor = getFirstAnchor(cells[1]);
    const numberDisplay = stripTags(cells[0]);
    const typeZhHansRaw = getAttribute(openingTag, "data-type");
    const categoryZhHansRaw = getAttribute(openingTag, "data-category");
    const typeZhHans = TYPE_ALIASES[typeZhHansRaw] ?? typeZhHansRaw;
    const categoryZhHans = CATEGORY_ALIASES[categoryZhHansRaw] ?? categoryZhHansRaw;
    const names = {
      "zh-Hans": nameAnchor.text,
      ja: stripTags(cells[2]),
      en: stripTags(cells[3]),
    };
    const displays = {
      power: stripTags(cells[6]),
      accuracy: stripTags(cells[7]),
      pp: stripTags(cells[8]),
    };

    if (!names["zh-Hans"] || !names.ja || !names.en || !typeZhHans || !categoryZhHans) {
      throw new Error(`无法解析第 ${index + 1} 个招式：${stripTags(row).slice(0, 140)}`);
    }

    return {
      moveNumber: parseNumeric(numberDisplay),
      numberDisplay,
      slug: toSlug(names.en) || `move-row-${index + 1}`,
      names,
      generation: getGeneration(markers, match.index),
      typeZhHans,
      categoryZhHans,
      power: parseNumeric(displays.power),
      accuracy: parseNumeric(displays.accuracy),
      pp: parseNumeric(displays.pp),
      displays,
      description: stripTags(cells[9]),
      wikiPath: nameAnchor.href,
      wikiUrl: toWikiUrl(nameAnchor.href),
    };
  });

  const slugCounts = Map.groupBy(entries, (entry) => entry.slug);
  return entries.map((entry, index) =>
    slugCounts.get(entry.slug).length > 1
      ? { ...entry, slug: `${entry.slug}-${entry.moveNumber ?? index + 1}` }
      : entry,
  );
}

function parseAbilities(html) {
  const markers = getGenerationMarkers(html, "abilities");
  const matches = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
  const entries = [];

  for (const match of matches) {
    const cells = getCells(match[0]);
    if (cells.length !== 7) continue;

    const numberDisplay = stripTags(cells[0]);
    const numberMatch = numberDisplay.match(/^(\d{3})/);
    if (!numberMatch) continue;

    const nameAnchor = getFirstAnchor(cells[1]);
    const names = {
      "zh-Hans": nameAnchor.text,
      ja: stripTags(cells[2]),
      en: stripTags(cells[3]),
    };
    if (!names["zh-Hans"] || !names.ja || !names.en) {
      throw new Error(`无法解析特性：${stripTags(match[0]).slice(0, 140)}`);
    }

    entries.push({
      abilityNumber: Number(numberMatch[1]),
      numberDisplay,
      numberNote: getAttribute(cells[0].match(/<span\b([^>]*)>/i)?.[1] ?? "", "title") || null,
      slug: toSlug(names.en) || `ability-row-${entries.length + 1}`,
      names,
      generation: getGeneration(markers, match.index),
      description: stripTags(cells[4]),
      commonCount: parseNumeric(stripTags(cells[5])),
      hiddenCount: parseNumeric(stripTags(cells[6])),
      wikiPath: nameAnchor.href,
      wikiUrl: toWikiUrl(nameAnchor.href),
    });
  }

  const slugCounts = Map.groupBy(entries, (entry) => entry.slug);
  return entries.map((entry, index) =>
    slugCounts.get(entry.slug).length > 1
      ? { ...entry, slug: `${entry.slug}-${entry.abilityNumber || index + 1}` }
      : entry,
  );
}

function assertUnique(entries, field, label) {
  const duplicates = entries
    .map((entry) => entry[field])
    .filter((value, index, values) => values.indexOf(value) !== index);
  if (duplicates.length) throw new Error(`${label}存在重复 ${field}：${[...new Set(duplicates)].join("、")}`);
}

function validate(moves, abilities) {
  const numberedMoves = moves.filter((move) => move.moveNumber !== null);
  const unnumberedMoves = moves.filter((move) => move.moveNumber === null);
  if (moves.length !== 953 || numberedMoves.length !== 920 || unnumberedMoves.length !== 33) {
    throw new Error(
      `招式数量异常：共 ${moves.length}，有编号 ${numberedMoves.length}，无编号 ${unnumberedMoves.length}`,
    );
  }
  numberedMoves.forEach((move, index) => {
    if (move.moveNumber !== index + 1) {
      throw new Error(`招式编号不连续：第 ${index + 1} 项实际为 ${move.moveNumber}`);
    }
  });
  if (abilities.length !== 317) {
    throw new Error(`特性条目应有 317 个，实际得到 ${abilities.length} 个`);
  }
  if (moves.some((move) => !["物理", "特殊", "变化", "极巨", "超极巨"].includes(move.categoryZhHans))) {
    throw new Error("招式列表存在未知分类");
  }
  assertUnique(moves, "slug", "招式列表");
  assertUnique(abilities, "slug", "特性列表");
}

function movesToMarkdown(moves, revisionId) {
  return [
    "# 原版招式列表",
    "",
    `> 来源：[52Poké Wiki 招式列表](${SOURCE_URLS.moves})（修订版本 ${revisionId}）。内容依照 CC BY-NC-SA 3.0 使用。`,
    "",
    `共 ${moves.length} 个条目，其中 ${moves.filter((move) => move.moveNumber !== null).length} 个有正式编号。`,
    "",
    "| 编号 | 中文名 | 日文名 | 英文名 | 属性 | 分类 | 威力 | 命中 | PP | 世代 |",
    "| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
    ...moves.map(
      (move) =>
        `| ${move.numberDisplay} | [${move.names["zh-Hans"]}](${move.wikiUrl}) | ${move.names.ja} | ${move.names.en} | ${move.typeZhHans} | ${move.categoryZhHans} | ${move.displays.power} | ${move.displays.accuracy} | ${move.displays.pp} | ${move.generation ?? "—"} |`,
    ),
    "",
  ].join("\n");
}

function abilitiesToMarkdown(abilities, revisionId) {
  return [
    "# 原版特性列表",
    "",
    `> 来源：[52Poké Wiki 特性列表](${SOURCE_URLS.abilities})（修订版本 ${revisionId}）。内容依照 CC BY-NC-SA 3.0 使用。`,
    "",
    `共 ${abilities.length} 个条目。`,
    "",
    "| 编号 | 中文名 | 日文名 | 英文名 | 世代 | 说明 |",
    "| ---: | --- | --- | --- | ---: | --- |",
    ...abilities.map(
      (ability) =>
        `| ${ability.numberDisplay} | [${ability.names["zh-Hans"]}](${ability.wikiUrl}) | ${ability.names.ja} | ${ability.names.en} | ${ability.generation ?? "—"} | ${ability.description.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ].join("\n");
}

async function fetchPage(title) {
  const api = new URL("/api.php", WIKI_ORIGIN);
  api.search = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "text|revid",
    format: "json",
    formatversion: "2",
  }).toString();
  const response = await fetch(api, {
    headers: {
      accept: "application/json",
      "user-agent": "PokeDIY-original-reference-generator/1.0 (https://wiki.52poke.com/)",
    },
  });
  if (!response.ok) throw new Error(`请求失败：${response.status} ${api}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`MediaWiki API 错误：${payload.error.info}`);
  return { ...payload.parse, apiUrl: api.href };
}

async function main() {
  const [movePage, abilityPage] = await Promise.all([
    fetchPage(PAGES.moves),
    fetchPage(PAGES.abilities),
  ]);
  const moves = parseMoves(movePage.text);
  const abilities = parseAbilities(abilityPage.text);
  validate(moves, abilities);

  const output = {
    schemaVersion: 1,
    language: "zh-Hans",
    generatedAt: new Date().toISOString(),
    counts: {
      moves: moves.length,
      numberedMoves: moves.filter((move) => move.moveNumber !== null).length,
      unnumberedMoves: moves.filter((move) => move.moveNumber === null).length,
      abilities: abilities.length,
    },
    license: {
      name: "CC BY-NC-SA 3.0",
      url: "https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans",
      attribution: "52Poké Wiki contributors",
    },
    sources: {
      moves: {
        title: movePage.title,
        pageId: movePage.pageid,
        revisionId: movePage.revid,
        pageUrl: SOURCE_URLS.moves,
        apiUrl: movePage.apiUrl,
      },
      abilities: {
        title: abilityPage.title,
        pageId: abilityPage.pageid,
        revisionId: abilityPage.revid,
        pageUrl: SOURCE_URLS.abilities,
        apiUrl: abilityPage.apiUrl,
      },
    },
    abilities,
    moves,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(OUTPUT_DIR, "original-content.json"),
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(OUTPUT_DIR, "moves.zh-CN.md"),
      movesToMarkdown(moves, movePage.revid),
      "utf8",
    ),
    writeFile(
      path.join(OUTPUT_DIR, "abilities.zh-CN.md"),
      abilitiesToMarkdown(abilities, abilityPage.revid),
      "utf8",
    ),
  ]);

  console.log(
    `已生成 ${abilities.length} 个特性及 ${moves.length} 个招式（${output.counts.numberedMoves} 个有编号，${output.counts.unnumberedMoves} 个无编号）。`,
  );
}

await main();
