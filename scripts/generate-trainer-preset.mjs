#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEX_FILE = path.join(
  ROOT,
  "data",
  "legends-za",
  "lumiose-pokedex.json",
);
const OUTPUT_DIR = path.join(ROOT, "data", "legends-za", "trainers");

const [trainerName, trainerId, countText] = process.argv.slice(2);
const count = Number(countText);

if (!trainerName || !/^\d{6}$/.test(trainerId ?? "")) {
  throw new Error(
    "用法：node scripts/generate-trainer-preset.mjs <训练家名称> <6位ID> <条数>",
  );
}

if (!Number.isInteger(count) || count < 1) {
  throw new Error("条数必须是正整数");
}

const dex = JSON.parse(await readFile(DEX_FILE, "utf8"));

if (count > dex.entries.length) {
  throw new Error(`条数不能超过图鉴总数 ${dex.entries.length}`);
}

const entries = dex.entries.slice(0, count).map((pokemon, index) => ({
  recordNumber: index + 1,
  trainerName,
  trainerId,
  lumioseDex: pokemon.lumioseDex,
  nationalDex: pokemon.nationalDex,
  slug: pokemon.slug,
  nameZhHans: pokemon.names["zh-Hans"],
  nameEn: pokemon.names.en,
  registered: true,
}));

const preset = {
  schemaVersion: 1,
  game: "pokemon-legends-za",
  presetType: "trainer-pokedex-registration",
  generatedAt: new Date().toISOString().slice(0, 10),
  trainer: {
    name: trainerName,
    id: trainerId,
  },
  sourceDex: "lumiose",
  selection: {
    strategy: "first-n-by-lumiose-dex",
    count,
    from: 1,
    to: count,
  },
  entries,
};

const safeName = trainerName
  .normalize("NFKD")
  .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
  .replace(/^-|-$/g, "");
const basename = `${trainerId}-${safeName}`;

const markdownRows = entries.map(
  (entry) =>
    `| ${entry.recordNumber} | ${String(entry.lumioseDex).padStart(3, "0")} | ${String(entry.nationalDex).padStart(4, "0")} | ${entry.nameZhHans} | ${entry.nameEn} | ${entry.trainerName} | ${entry.trainerId} |`,
);
const markdown = [
  `# 训练家预存数据：${trainerName}`,
  "",
  `- 训练家 ID：${trainerId}`,
  `- 登记数量：${count}`,
  `- 范围：密阿雷图鉴 #001–#${String(count).padStart(3, "0")}`,
  "",
  "| 记录 | 密阿雷 | 全国 | 中文名 | 英文名 | 训练家 | ID |",
  "| ---: | ---: | ---: | --- | --- | --- | --- |",
  ...markdownRows,
  "",
].join("\n");

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(
    path.join(OUTPUT_DIR, `${basename}.json`),
    `${JSON.stringify(preset, null, 2)}\n`,
    "utf8",
  ),
  writeFile(path.join(OUTPUT_DIR, `${basename}.zh-CN.md`), markdown, "utf8"),
]);

console.log(
  `已为训练家 ${trainerName}（ID ${trainerId}）写入 ${entries.length} 条记录。`,
);

