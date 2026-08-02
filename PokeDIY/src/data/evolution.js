export function normalizeEvolutionCondition(condition, legacyText = "") {
  if (condition?.method) {
    return {
      method: condition.method,
      values: { ...(condition.values || {}) },
    };
  }
  if (legacyText?.trim()) {
    return {
      method: "Other",
      values: { description: legacyText.trim() },
    };
  }
  return { method: "", values: {} };
}

export function getMethodDefaults(method) {
  return Object.fromEntries(
    (method?.fields || [])
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.key, String(field.defaultValue)]),
  );
}

export function getEvolutionEntryLabel(entry) {
  if (!entry) return "未选择宝可梦";
  const name = entry.names?.["zh-Hans"] || entry.name || entry.slug;
  return entry.formLabel ? `${name}（${entry.formLabel}）` : name;
}

function appendExtra(summary, values) {
  return values.extra?.trim()
    ? `${summary}（${values.extra.trim()}）`
    : summary;
}

export function formatEvolutionCondition(condition, methods, dexEntries) {
  const normalized = normalizeEvolutionCondition(condition);
  const values = normalized.values;
  const method = methods.find((item) => item.id === normalized.method);
  if (!method) return "未设置进化方式";

  const partner = dexEntries.find((entry) => entry.slug === values.partner);
  const partnerName = getEvolutionEntryLabel(partner);
  const time = values.time && values.time !== "不限" ? `，${values.time}` : "";
  let summary;

  switch (normalized.method) {
    case "Level":
      summary = `${values.level ? `等级 ${values.level} 以上` : "提升等级"}${time}${values.weather ? `，天气为${values.weather}` : ""}`;
      break;
    case "Happiness":
      summary = `亲密度／友好度达到 ${values.friendship || 158}${values.moveType ? `，并学会${values.moveType}属性招式` : ""}${time}后提升等级`;
      break;
    case "Location":
      summary = `来到${values.location || "指定地点"}附近后提升等级`;
      break;
    case "Beautiful":
      summary = `美丽度达到 ${values.beauty || 170} 后提升等级`;
      break;
    case "Item":
      summary = `使用${values.item || "指定道具"}${time}`;
      break;
    case "Move":
      summary = `学会${values.move || "指定招式"}后提升等级`;
      break;
    case "Movetype":
      summary = `学会${values.moveType || "指定"}属性招式后提升等级`;
      break;
    case "Movetimes":
      summary = `${values.style ? `以${values.style}方式` : ""}使出${values.move || "指定招式"} ${values.times || 20} 次后提升等级`;
      break;
    case "Held":
      summary = `携带${values.heldItem || "指定道具"}${time}后提升等级`;
      break;
    case "Trade":
      summary = `${values.heldItem ? `携带${values.heldItem}并` : ""}${values.partner ? `与${partnerName}互相` : ""}连接交换`;
      break;
    case "Pokémon":
      summary = `与${values.partner ? partnerName : "指定宝可梦"}同行时提升等级`;
      break;
    case "Affection":
      summary = `友好度达到 ${values.friendship || 158}${values.moveType ? `，并学会${values.moveType}属性招式` : ""}${time}后提升等级`;
      break;
    case "Critical":
      summary = `对战中击中要害 ${values.critical || 3} 次或以上后结束对战`;
      break;
    case "Spin":
      summary = `${values.heldItem ? `携带${values.heldItem}，` : ""}主角${values.style || "完成原地旋转"}${time}`;
      break;
    case "Damage":
      summary = `受到至少 ${values.damage || 49} 点伤害后，前往${values.location || "指定地点"}`;
      break;
    case "Hittimes":
      summary = `使用${values.move || "指定招式"}累计攻击 ${values.times || 20} 个目标`;
      break;
    case "Letsgo":
      summary = `在 Let's Go 模式中行走 ${values.steps || 1000} 步后提升等级`;
      break;
    case "Other":
      summary = values.description?.trim() || "其他特殊条件";
      break;
    case "None":
      summary = "无进化方式";
      break;
    default:
      summary = method.label;
  }

  return appendExtra(summary, values);
}

export function toWikiEvolutionTemplate(condition, methods, dexEntries) {
  const normalized = normalizeEvolutionCondition(condition);
  const values = normalized.values;
  const method = methods.find((item) => item.id === normalized.method);
  if (!method) return "进化方式未填写";

  const partner = dexEntries.find((entry) => entry.slug === values.partner);
  const partnerName = partner?.names?.["zh-Hans"] || "";
  const params = [];
  const add = (key, value) => {
    if (value !== undefined && value !== null && String(value).trim())
      params.push(`${key}=${String(value).trim()}`);
  };

  switch (normalized.method) {
    case "Level":
      add("level", values.level);
      add("time", values.time === "不限" ? "" : values.time);
      add("weather", values.weather);
      break;
    case "Happiness":
      add("affection", values.friendship);
      add("movetype", values.moveType);
      add("time", values.time === "不限" ? "" : values.time);
      break;
    case "Location":
      add("location", values.location);
      break;
    case "Beautiful":
      add("beautiful", values.beauty);
      break;
    case "Item":
      add("item", values.item);
      add("time", values.time === "不限" ? "" : values.time);
      break;
    case "Move":
      add("move", values.move);
      break;
    case "Movetype":
      add("movetype", values.moveType);
      break;
    case "Movetimes":
      add("move", values.move);
      add("times", values.times);
      add("master", values.style);
      break;
    case "Held":
      add("held", values.heldItem);
      add("time", values.time === "不限" ? "" : values.time);
      break;
    case "Trade":
      add("held", values.heldItem);
      add("pokemon", partnerName);
      add("ms", partner?.spriteKey);
      break;
    case "Pokémon":
      add("pokemon", partnerName);
      add("ms", partner?.spriteKey);
      break;
    case "Affection":
      add("affection", values.friendship);
      add("movetype", values.moveType);
      add("time", values.time === "不限" ? "" : values.time);
      break;
    case "Critical":
      add("critical", values.critical);
      break;
    case "Spin":
      break;
    case "Damage":
      add("damage", values.damage);
      add("location", values.location);
      break;
    case "Hittimes":
      add("move", values.move);
      add("times", values.times);
      break;
    case "Letsgo":
      add("step", values.steps);
      break;
    case "Other":
      add("evotype", values.description);
      break;
    default:
      break;
  }
  add("extra1", values.extra);
  return `{{进化框/Evo|${method.id}${params.map((param) => `|${param}`).join("")}}}`;
}
