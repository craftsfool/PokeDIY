#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NATIONAL_PATH = path.join(
  ROOT,
  "data",
  "national",
  "national-pokedex.json",
);
const OUTPUT = path.join(ROOT, "data", "national", "pokemon-forms.json");
const SOURCE_TITLE = "宝可梦列表（按全国图鉴编号）/形态变化";
const SOURCE_URL = `https://wiki.52poke.com/wiki/${encodeURIComponent(SOURCE_TITLE)}`;
const api = new URL("https://wiki.52poke.com/api.php");
api.search = new URLSearchParams({
  action: "parse",
  page: SOURCE_TITLE,
  prop: "text|revid",
  format: "json",
  formatversion: "2",
}).toString();

function decodeHtml(value = "") {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
    const digits = radix === 16 ? code.slice(2) : code.slice(1);
    return String.fromCodePoint(Number.parseInt(digits, radix));
  });
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(fragment, name) {
  const match = fragment.match(
    new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return decodeHtml(match?.[1] ?? match?.[2] ?? "");
}

function getCells(row) {
  return row.match(/<td\b[\s\S]*?<\/td>/gi) ?? [];
}

function getCell(cells, className) {
  return (
    cells.find((cell) =>
      getAttribute(cell.slice(0, cell.indexOf(">") + 1), "class")
        .split(/\s+/)
        .includes(className),
    ) ?? ""
  );
}

function classify(label) {
  if (/阿罗拉|伽勒尔|洗翠|帕底亚/.test(label)) return "地区形态";
  if (/^超级/.test(label)) return "超级进化";
  if (/超极巨/.test(label)) return "超极巨化";
  if (/原始/.test(label)) return "原始回归";
  return "特殊形态";
}

async function main() {
  const national = JSON.parse(await readFile(NATIONAL_PATH, "utf8"));
  const speciesByDex = new Map(
    national.entries.map((entry) => [entry.nationalDex, entry]),
  );
  const response = await fetch(api, {
    headers: {
      accept: "application/json",
      "user-agent":
        "PokeDIY-form-reference-generator/1.0 (https://wiki.52poke.com/)",
    },
  });
  if (!response.ok) throw new Error(`请求失败：${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.info);

  const rows = payload.parse.text.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const forms = [];
  for (const row of rows) {
    const cells = getCells(row);
    const nationalDex = Number(
      stripTags(getCell(cells, "rdexn-id")).replace(/\D/g, ""),
    );
    const formId = stripTags(getCell(cells, "rdexn-formid"));
    const species = speciesByDex.get(nationalDex);
    if (!species || !formId || formId === "000") continue;

    const nameCell = getCell(cells, "rdexn-name");
    const labelCell = getCell(cells, "rdexn-jpname");
    const formLabel =
      stripTags(labelCell) ||
      stripTags(
        nameCell.match(/<small\b[^>]*>([\s\S]*?)<\/small>/i)?.[1] ?? "",
      ) ||
      `形态 ${formId}`;
    const spriteKey =
      getCell(cells, "rdexn-msp").match(/\bsprite-icon-([\dA-Z-]+)\b/)?.[1] ??
      null;
    forms.push({
      nationalDex,
      slug: `${species.slug}--form-${formId}`,
      names: species.names,
      formId,
      formLabel,
      formClass: classify(formLabel),
      generation: species.generation,
      spriteKey,
      wikiTitle: species.wikiTitle,
      wikiPath: species.wikiPath,
      wikiUrl: species.wikiUrl,
    });
  }

  if (forms.length < 400) throw new Error(`形态数量异常：${forms.length}`);
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    license: national.license,
    source: {
      title: payload.parse.title,
      revisionId: payload.parse.revid ?? null,
      pageUrl: SOURCE_URL,
      apiUrl: api.href,
    },
    count: forms.length,
    countsByClass: Object.fromEntries(
      Object.entries(Object.groupBy(forms, (form) => form.formClass)).map(
        ([key, items]) => [key, items.length],
      ),
    ),
    forms,
  };

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    `已生成 ${forms.length} 个地区与特殊形态（52poke 修订版本 ${payload.parse.revid}）。`,
  );
}

await main();
