import { useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";
import { types } from "../data/library";
import {
  getEvolutionEntryLabel,
  normalizeEvolutionCondition,
  toWikiEvolutionTemplate,
} from "../data/evolution";
import { EvolutionEditor } from "./EvolutionEditor";
import { WikiInfobox } from "./WikiInfobox";
import { WikiArticlePreview } from "./WikiArticlePreview";
import {
  categoryPalette,
  getMoveMeta,
  getTypePalette,
  MoveCategoryBadge,
  statPalette,
  TypeBadge,
  TypeIcon,
} from "./PokemonDecor";

const sectionLinks = [
  ["basic", "基本资料"],
  ["image", "形象设定"],
  ["evolution", "进化与形态"],
  ["abilities", "特性与招式"],
  ["stats", "种族值"],
  ["publish", "预览与发布"],
];

function Field({ label, help, children, wide = false }) {
  return (
    <label className={wide ? "wiki-field wide" : "wiki-field"}>
      <span>
        {label}
        {help && <small>{help}</small>}
      </span>
      {children}
    </label>
  );
}

function Section({ id, title, children }) {
  return (
    <section className="wiki-section" id={id}>
      <div className="wiki-section-title">
        <h2>{title}</h2>
        <a href={`#${id}`}>编辑</a>
      </div>
      {children}
    </section>
  );
}

function normalizeAbilitySelection(selection, legacySlots, selectedAbilityIds) {
  const selected = new Set(selectedAbilityIds);
  const claimed = new Set();
  const normalized = { regular: [], hidden: "" };

  const regularCandidates = [
    ...(selection?.regular || []),
    legacySlots?.a,
    legacySlots?.b,
  ];
  for (const id of regularCandidates) {
    if (
      id &&
      selected.has(id) &&
      !claimed.has(id) &&
      normalized.regular.length < 2
    ) {
      normalized.regular.push(id);
      claimed.add(id);
    }
  }

  const hiddenCandidate = selection?.hidden || legacySlots?.hidden;
  if (
    hiddenCandidate &&
    selected.has(hiddenCandidate) &&
    !claimed.has(hiddenCandidate)
  ) {
    normalized.hidden = hiddenCandidate;
    claimed.add(hiddenCandidate);
  }

  for (const id of selectedAbilityIds) {
    if (claimed.has(id)) continue;
    if (normalized.regular.length < 2) normalized.regular.push(id);
    else if (!normalized.hidden) normalized.hidden = id;
    else break;
    claimed.add(id);
  }

  return normalized;
}

export function WikiEditor({
  draft,
  setDraft,
  dexEntries,
  evolutionMethods,
  resources,
  saved,
  onSave,
  onToast,
}) {
  const fileRef = useRef(null);
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceKind, setResourceKind] = useState("全部");
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState({
    kind: "特性",
    name: "",
    description: "",
    type: "一般",
    category: "变化",
  });
  const [accepted, setAccepted] = useState(false);
  const [showWikiText, setShowWikiText] = useState(false);
  const [showArticlePreview, setShowArticlePreview] = useState(false);
  const allResources = useMemo(
    () => [...resources, ...draft.custom],
    [resources, draft.custom],
  );
  const resourceCounts = useMemo(
    () => ({
      abilities: resources.filter((item) => item.kind === "特性").length,
      moves: resources.filter((item) => item.kind === "招式").length,
    }),
    [resources],
  );
  const selectedItems = useMemo(
    () => allResources.filter((item) => draft.selected.includes(item.id)),
    [allResources, draft.selected],
  );
  const selectedAbilityIds = useMemo(
    () =>
      selectedItems
        .filter((item) => item.kind === "特性")
        .map((item) => item.id),
    [selectedItems],
  );
  const abilitySelection = useMemo(
    () =>
      normalizeAbilitySelection(
        draft.abilitySelection,
        draft.abilitySlots,
        selectedAbilityIds,
      ),
    [draft.abilitySelection, draft.abilitySlots, selectedAbilityIds],
  );
  const searchResults = useMemo(
    () =>
      allResources
        .filter(
          (item) =>
            (resourceKind === "全部" || item.kind === resourceKind) &&
            (!resourceQuery ||
              `${item.name}${item.names?.ja || ""}${item.names?.en || ""}${item.description}`
                .toLowerCase()
                .includes(resourceQuery.toLowerCase())),
        )
        .slice(0, resourceQuery ? 14 : 6),
    [allResources, resourceKind, resourceQuery],
  );

  const update = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const updateStat = (key, value) =>
    setDraft((current) => ({
      ...current,
      stats: {
        ...current.stats,
        [key]: Math.max(1, Math.min(255, Number(value) || 1)),
      },
    }));
  const toggleType = (type) =>
    update(
      "types",
      draft.types.includes(type)
        ? draft.types.filter((t) => t !== type)
        : draft.types.length < 2
          ? [...draft.types, type]
          : [draft.types[1], type],
    );
  const toggleResource = (id) => {
    const item = allResources.find((resource) => resource.id === id);
    setDraft((current) => {
      const isSelected = current.selected.includes(id);
      const learnMethods = { ...(current.learnMethods || {}) };
      const currentAbilityIds = allResources
        .filter(
          (resource) =>
            resource.kind === "特性" && current.selected.includes(resource.id),
        )
        .map((resource) => resource.id);
      const selection = normalizeAbilitySelection(
        current.abilitySelection,
        current.abilitySlots,
        currentAbilityIds,
      );

      if (isSelected) delete learnMethods[id];
      else if (item?.kind === "招式" && learnMethods[id] === undefined)
        learnMethods[id] = "-";

      if (item?.kind === "特性") {
        if (isSelected) {
          selection.regular = selection.regular.filter(
            (abilityId) => abilityId !== id,
          );
          if (selection.hidden === id) selection.hidden = "";
        } else {
          if (selection.regular.length < 2) selection.regular.push(id);
          else if (!selection.hidden) selection.hidden = id;
          else {
            onToast("普通特性最多两个，隐藏特性最多一个");
            return current;
          }
        }
      }

      return {
        ...current,
        selected: isSelected
          ? current.selected.filter((x) => x !== id)
          : [...current.selected, id],
        learnMethods,
        abilitySelection: selection,
      };
    });
  };
  const changeAbilityRole = (id, nextRole) =>
    setDraft((current) => {
      const currentAbilityIds = allResources
        .filter(
          (resource) =>
            resource.kind === "特性" && current.selected.includes(resource.id),
        )
        .map((resource) => resource.id);
      const selection = normalizeAbilitySelection(
        current.abilitySelection,
        current.abilitySlots,
        currentAbilityIds,
      );
      const currentRole = selection.hidden === id ? "hidden" : "regular";
      if (currentRole === nextRole) return current;

      if (nextRole === "hidden") {
        if (selection.hidden && selection.hidden !== id) {
          onToast("隐藏特性最多一个");
          return current;
        }
        selection.regular = selection.regular.filter(
          (abilityId) => abilityId !== id,
        );
        selection.hidden = id;
      } else {
        if (selection.regular.length >= 2) {
          onToast("普通特性最多两个");
          return current;
        }
        if (selection.hidden === id) selection.hidden = "";
        selection.regular.push(id);
      }

      return { ...current, abilitySelection: selection };
    });
  const updateLearnMethod = (id, value) =>
    setDraft((current) => ({
      ...current,
      learnMethods: { ...(current.learnMethods || {}), [id]: value },
    }));
  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("image", reader.result);
    reader.readAsDataURL(file);
  };
  const addCustom = () => {
    if (!custom.name.trim() || !custom.description.trim())
      return onToast("请填写名称和效果说明");
    if (
      custom.kind === "特性" &&
      abilitySelection.regular.length >= 2 &&
      abilitySelection.hidden
    )
      return onToast("普通特性最多两个，隐藏特性最多一个");
    const item = {
      ...custom,
      id: `custom-${Date.now()}`,
      name: custom.name.trim(),
      description: custom.description.trim(),
      source: "原创",
    };
    setDraft((current) => {
      const selection = {
        regular: [...abilitySelection.regular],
        hidden: abilitySelection.hidden,
      };
      if (item.kind === "特性") {
        if (selection.regular.length < 2) selection.regular.push(item.id);
        else selection.hidden = item.id;
      }
      return {
        ...current,
        custom: [...current.custom, item],
        selected: [...current.selected, item.id],
        abilitySelection: selection,
        learnMethods:
          item.kind === "招式"
            ? { ...(current.learnMethods || {}), [item.id]: "-" }
            : current.learnMethods,
      };
    });
    setCustom({
      kind: "特性",
      name: "",
      description: "",
      type: "一般",
      category: "变化",
    });
    setShowCustom(false);
    onToast(`已添加原创${item.kind}`);
  };
  const generateWikiText = () => {
    const abilityById = new Map(
      selectedItems
        .filter((item) => item.kind === "特性")
        .map((item) => [item.id, item]),
    );
    const regularAbilities = abilitySelection.regular
      .map((id) => abilityById.get(id)?.name)
      .filter(Boolean);
    const hiddenAbility = abilityById.get(abilitySelection.hidden)?.name || "";
    const abilityParameters = [
      regularAbilities.length === 2 ? "|abilityn=2" : null,
      regularAbilities[0] ? `|ability1=${regularAbilities[0]}` : null,
      regularAbilities[1] ? `|ability2=${regularAbilities[1]}` : null,
      hiddenAbility ? `|abilityd=${hiddenAbility}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const moves = selectedItems
      .filter((x) => x.kind === "招式")
      .sort((a, b) => {
        const rank = (move) => {
          const method = String(draft.learnMethods?.[move.id] || "-");
          if (method === "进化") return -1;
          if (/^\d+$/.test(method)) return Number(method);
          return 999;
        };
        return rank(a) - rank(b) || a.name.localeCompare(b.name, "zh-CN");
      });
    const moveRows = moves.length
      ? moves
          .map((move) => {
            const rawMethod = String(
              draft.learnMethods?.[move.id] || "-",
            ).trim();
            const learnMethod =
              rawMethod === "进化" ||
              rawMethod === "-" ||
              /^\d+$/.test(rawMethod)
                ? rawMethod
                : "-";
            const meta = getMoveMeta(move);
            return `|-${"\n"}| ${learnMethod} || [[${move.name}]] || ${meta.type} || ${meta.category} || ${move.power || "—"} || ${move.accuracy || "—"} || ${move.pp || "—"}`;
          })
          .join("\n")
      : '|-\n| colspan="7" | 未填写';
    const evolutionCondition = normalizeEvolutionCondition(
      draft.evolutionCondition,
      draft.evolutionMethod,
    );
    const existingEntry = dexEntries.find(
      (entry) => entry.slug === draft.evolutionBase,
    );
    const existingName = getEvolutionEntryLabel(existingEntry);
    const customName = draft.name || "未命名宝可梦";
    const evolutionTemplate = toWikiEvolutionTemplate(
      evolutionCondition,
      evolutionMethods,
      dexEntries,
    );
    const evolutionText = draft.evolutionBase
      ? draft.evolutionDirection === "from-custom"
        ? `'''${customName}''' ${evolutionTemplate} → [[${existingEntry?.names?.["zh-Hans"] || existingName}]]${existingEntry?.formLabel ? `（${existingEntry.formLabel}）` : ""}`
        : `[[${existingEntry?.names?.["zh-Hans"] || existingName}]]${existingEntry?.formLabel ? `（${existingEntry.formLabel}）` : ""} ${evolutionTemplate} → '''${customName}'''`
      : "原创独立进化链。";
    const baseSpeciesName =
      existingEntry?.names?.["zh-Hans"] || existingName || "未填写";
    const originalForm = existingEntry?.formLabel || "通常形态";
    const customFormLabel = draft.formLabel?.trim() || "未命名原创形态";
    const formText = draft.evolutionBase
      ? `'''${customName}'''被设定为[[${baseSpeciesName}]]的原创${draft.formCategory || "特殊形态"}，形态名称为“${customFormLabel}”。\n\n{{原创宝可梦形态关系\n|原物种=${baseSpeciesName}\n|原形态=${originalForm}\n|原创名称=${customName}\n|原创形态=${customFormLabel}\n|形态类别=${draft.formCategory || "特殊形态"}\n|属性=${draft.types.join("/") || "未填写"}\n}}`
      : "尚未选择关联原物种。";
    const relationHeading = draft.relationshipMode === "form" ? "形态" : "进化";
    const relationText =
      draft.relationshipMode === "form" ? formText : evolutionText;
    const abilityText = regularAbilities.length
      ? `普通特性为${regularAbilities.map((name) => `[[${name}]]`).join("或")}。${hiddenAbility ? `隐藏特性为[[${hiddenAbility}]]。` : ""}`
      : "普通特性尚未设定。";
    const statRows = Object.entries(draft.stats)
      .map(([name, value]) => `|-\n! ${name}\n| ${value}`)
      .join("\n");
    const total = Object.values(draft.stats).reduce(
      (sum, value) => sum + Number(value),
      0,
    );
    const overview = `${draft.name || "未命名宝可梦"}被归类为“${draft.category || "分类未定"}”。${draft.height ? `身高为${draft.height}米，` : ""}${draft.weight ? `体重为${draft.weight}千克。` : ""}`;
    return `{{原创宝可梦信息框\n|名称=${draft.name || "未命名"}\n|日文名=${draft.jaName}\n|英文名=${draft.enName}\n|属性=${draft.types.join("/") || "未填写"}\n|分类=${draft.category}\n${abilityParameters}\n|身高=${draft.height}m\n|体重=${draft.weight}kg\n}}\n\n'''${draft.name || "未命名宝可梦"}'''是由社区用户创作的原创宝可梦。\n\n==概述==\n${overview}\n\n==游戏中==\n${abilityText}\n\n===种族值===\n{| class="wikitable"\n! 能力 !! 种族值\n${statRows}\n|-\n! 总和\n| ${total}\n|}\n\n===图鉴介绍===\n${draft.description || "尚未填写。"}\n\n===属性相性===\n属性组合为${draft.types.join("／") || "未填写"}。\n\n===可学会招式表===\n{| class="wikitable"\n! 等级 !! 招式 !! 属性 !! 分类 !! 威力 !! 命中 !! PP\n${moveRows}\n|}\n\n==${relationHeading}==\n${relationText}\n\n==形象==\n${draft.artist ? `原创形象由${draft.artist}绘制。` : "形象作者尚未填写。"}\n\n==名字==\n{| class="wikitable"\n! 语言 !! 名字\n|-\n! 中文\n| ${draft.name || "未填写"}\n|-\n! 日文\n| ${draft.jaName || "未填写"}\n|-\n! 英文\n| ${draft.enName || "未填写"}\n|}\n\n==原型剖析==\n${draft.origin || "尚未填写。"}\n\n==细节==\n* 本条目记载的是玩家原创设定，并非官方宝可梦资料。\n* 形象作者：${draft.artist || "未填写"}。\n* 本词条以 CC BY-NC-SA 3.0 协议发布。`;
  };
  const wikiText = generateWikiText();
  const copyWikiText = async () => {
    try {
      await navigator.clipboard.writeText(wikiText);
      onToast("Wiki 文本已复制");
    } catch {
      onToast("复制失败，请手动选择文本");
    }
  };
  const downloadJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ...draft,
            abilitySelection,
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.name || "pokemon-diy"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("JSON 设定已下载");
  };

  return (
    <>
      <aside className="wiki-toc">
        <div>
          <strong>目录</strong>
          <button>隐藏</button>
        </div>
        <ol>
          {sectionLinks.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`}>
                <span>{i + 1}</span>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </aside>
      <article className="wiki-article">
        <div className="article-title-row">
          <h1>{draft.name ? `创建：${draft.name}` : "创建原创宝可梦"}</h1>
          <span>{saved ? "草稿已保存" : "正在保存…"}</span>
        </div>
        <div className="article-tabs">
          <div>
            <a className="active">创建</a>
            <a>讨论</a>
            <button>
              简体 <ChevronDown size={14} />
            </button>
          </div>
          <div>
            <a className="active">编辑</a>
            <button onClick={() => setShowArticlePreview(true)}>预览</button>
            <a>历史</a>
            <button>
              工具 <ChevronDown size={14} />
            </button>
          </div>
        </div>
        <div className="license-notice">
          <strong>原创宝可梦创作页</strong>
          <span>
            请只上传你有权发布的原创内容。提交后，词条将以{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-NC-SA 3.0
            </a>{" "}
            协议共享。
          </span>
        </div>
        <div className="article-actions">
          <span>
            {draft.name
              ? `正在编辑“${draft.name}”`
              : "从基本资料开始填写，右侧信息框会即时更新。"}
          </span>
          <button className="wiki-button" onClick={onSave}>
            <Save size={15} />
            {saved ? "保存草稿" : "立即保存"}
          </button>
        </div>
        <div className="editor-grid">
          <div className="editor-main">
            <Section id="basic" title="基本资料">
              <div className="wiki-form-grid">
                <Field label="中文名" help="必填">
                  <input
                    value={draft.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="原创宝可梦的名称"
                  />
                </Field>
                <Field label="分类">
                  <input
                    value={draft.category}
                    onChange={(e) => update("category", e.target.value)}
                    placeholder="例如：种子宝可梦"
                  />
                </Field>
                <Field label="日文名">
                  <input
                    value={draft.jaName}
                    onChange={(e) => update("jaName", e.target.value)}
                    placeholder="可选"
                  />
                </Field>
                <Field label="英文名">
                  <input
                    value={draft.enName}
                    onChange={(e) => update("enName", e.target.value)}
                    placeholder="可选"
                  />
                </Field>
                <Field label="身高（m）">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.height}
                    onChange={(e) => update("height", e.target.value)}
                  />
                </Field>
                <Field label="体重（kg）">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.weight}
                    onChange={(e) => update("weight", e.target.value)}
                  />
                </Field>
              </div>
              <div className="wiki-field wide">
                <span>
                  属性<small>最多选择两个；第一属性决定信息框配色</small>
                </span>
                <div className="wiki-type-list">
                  {types.map((type) => {
                    const palette = getTypePalette(type);
                    return (
                      <button
                        key={type}
                        className={draft.types.includes(type) ? "selected" : ""}
                        style={{
                          "--type-choice": palette.badge,
                          "--type-choice-dark": palette.dark,
                        }}
                        onClick={() => toggleType(type)}
                      >
                        <TypeIcon type={type} />
                        <span>{type}</span>
                        {draft.types.includes(type) && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="图鉴说明" wide>
                <textarea
                  rows="4"
                  value={draft.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="描述它的生态、习性或与人类的关系。"
                />
              </Field>
            </Section>
            <Section id="image" title="形象设定">
              <div className="upload-row">
                <div>
                  <strong>
                    {draft.image ? "已上传形象设定" : "尚未上传图片"}
                  </strong>
                  <span>建议透明背景，发布前请确认作者授权。</span>
                </div>
                <button
                  className="wiki-button"
                  onClick={() => fileRef.current?.click()}
                >
                  <Plus size={15} />
                  {draft.image ? "更换图片" : "选择图片"}
                </button>
                <input
                  ref={fileRef}
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImage}
                />
              </div>
              <Field label="画师／形象作者" wide>
                <input
                  value={draft.artist}
                  onChange={(e) => update("artist", e.target.value)}
                  placeholder="用于发布时署名"
                />
              </Field>
            </Section>
            <Section id="evolution" title="进化与形态">
              <EvolutionEditor
                draft={draft}
                setDraft={setDraft}
                dexEntries={dexEntries}
                evolutionMethods={evolutionMethods}
                resources={resources}
              />
            </Section>
            <Section id="abilities" title="特性与招式">
              <div className="resource-toolbar">
                <label>
                  <Search size={16} />
                  <input
                    value={resourceQuery}
                    onChange={(e) => setResourceQuery(e.target.value)}
                    placeholder="搜索原版特性或招式"
                  />
                  {resourceQuery && (
                    <button
                      onClick={() => setResourceQuery("")}
                      aria-label="清空搜索"
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
                <select
                  value={resourceKind}
                  onChange={(e) => setResourceKind(e.target.value)}
                >
                  <option>全部</option>
                  <option>特性</option>
                  <option>招式</option>
                </select>
              </div>
              <div className="resource-table">
                {searchResults.map((item) => {
                  const moveMeta = getMoveMeta(item);
                  const abilityRole =
                    abilitySelection.hidden === item.id
                      ? "hidden"
                      : abilitySelection.regular.includes(item.id)
                        ? "regular"
                        : null;
                  return (
                    <button
                      key={item.id}
                      className={
                        draft.selected.includes(item.id) ? "selected" : ""
                      }
                      onClick={() => toggleResource(item.id)}
                    >
                      <span className="resource-check">
                        {draft.selected.includes(item.id) && (
                          <Check size={13} />
                        )}
                      </span>
                      <b>{item.name}</b>
                      <span className="resource-decor">
                        {moveMeta ? (
                          <>
                            <TypeBadge type={moveMeta.type} compact />
                            <MoveCategoryBadge
                              category={moveMeta.category}
                              compact
                            />
                          </>
                        ) : (
                          <span className="ability-badge">
                            {abilityRole === "hidden"
                              ? "隐藏特性"
                              : abilityRole === "regular"
                                ? "普通特性"
                                : "特性"}
                          </span>
                        )}
                      </span>
                      <em>{item.description}</em>
                    </button>
                  );
                })}
              </div>
              <div className="selected-summary">
                <strong>已选择 {selectedItems.length} 项</strong>
                <div className="selected-resource-list">
                  {selectedItems.map((item) => {
                    const moveMeta = getMoveMeta(item);
                    const learnValue = String(
                      draft.learnMethods?.[item.id] || "-",
                    );
                    const learnMode =
                      learnValue === "进化"
                        ? "evolution"
                        : /^\d+$/.test(learnValue)
                          ? "level"
                          : "none";
                    return (
                      <div
                        className={
                          item.kind === "招式"
                            ? "selected-resource move"
                            : "selected-resource"
                        }
                        key={item.id}
                      >
                        <span>
                          <a
                            href={
                              item.wikiUrl ||
                              `https://wiki.52poke.com/wiki/${encodeURIComponent(item.name)}`
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.name}
                          </a>
                          <small>
                            {moveMeta ? (
                              <>
                                <TypeBadge type={moveMeta.type} compact />
                                <MoveCategoryBadge
                                  category={moveMeta.category}
                                  compact
                                />
                              </>
                            ) : (
                              `${item.kind} · ${item.source || "原版"}`
                            )}
                          </small>
                        </span>
                        {item.kind === "招式" && (
                          <label className="learn-method-control">
                            习得方式
                            <span>
                              <select
                                aria-label={`${item.name}的习得方式`}
                                value={learnMode}
                                onChange={(e) => {
                                  const mode = e.target.value;
                                  updateLearnMethod(
                                    item.id,
                                    mode === "evolution"
                                      ? "进化"
                                      : mode === "level"
                                        ? "1"
                                        : "-",
                                  );
                                }}
                              >
                                <option value="none">-</option>
                                <option value="level">等级</option>
                                <option value="evolution">进化</option>
                              </select>
                              {learnMode === "level" && (
                                <input
                                  aria-label={`${item.name}的习得等级`}
                                  type="number"
                                  min="1"
                                  max="100"
                                  step="1"
                                  value={learnValue}
                                  onChange={(e) =>
                                    updateLearnMethod(
                                      item.id,
                                      e.target.value || "-",
                                    )
                                  }
                                />
                              )}
                            </span>
                          </label>
                        )}
                        {item.kind === "特性" && (
                          <label className="ability-role-picker">
                            类型
                            <select
                              aria-label={`${item.name}的特性类型`}
                              value={
                                abilitySelection.hidden === item.id
                                  ? "hidden"
                                  : "regular"
                              }
                              onChange={(e) =>
                                changeAbilityRole(item.id, e.target.value)
                              }
                            >
                              <option value="regular">普通特性</option>
                              <option value="hidden">隐藏特性</option>
                            </select>
                          </label>
                        )}
                        <button
                          onClick={() => toggleResource(item.id)}
                          aria-label={`移除${item.name}`}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <small className="learn-method-help">
                  普通特性可选一个或两个，页面中以“或”连接；隐藏特性可不选，最多一个。习得等级仅填写数字、－或“进化”。
                </small>
              </div>
              {showCustom ? (
                <div className="custom-box">
                  <div className="wiki-form-grid">
                    <Field label="内容类型">
                      <select
                        value={custom.kind}
                        onChange={(e) =>
                          setCustom((c) => ({ ...c, kind: e.target.value }))
                        }
                      >
                        <option>特性</option>
                        <option>招式</option>
                      </select>
                    </Field>
                    <Field label="名称">
                      <input
                        value={custom.name}
                        onChange={(e) =>
                          setCustom((c) => ({ ...c, name: e.target.value }))
                        }
                      />
                    </Field>
                    {custom.kind === "招式" && (
                      <>
                        <Field label="招式属性">
                          <select
                            value={custom.type}
                            onChange={(e) =>
                              setCustom((c) => ({ ...c, type: e.target.value }))
                            }
                          >
                            {types.map((type) => (
                              <option key={type}>{type}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="招式分类">
                          <select
                            value={custom.category}
                            onChange={(e) =>
                              setCustom((c) => ({
                                ...c,
                                category: e.target.value,
                              }))
                            }
                          >
                            {Object.keys(categoryPalette).map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                        </Field>
                      </>
                    )}
                  </div>
                  <Field label="效果说明" wide>
                    <textarea
                      rows="3"
                      value={custom.description}
                      onChange={(e) =>
                        setCustom((c) => ({
                          ...c,
                          description: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <div className="inline-actions">
                    <button
                      className="wiki-button quiet"
                      onClick={() => setShowCustom(false)}
                    >
                      取消
                    </button>
                    <button className="wiki-button primary" onClick={addCustom}>
                      添加原创内容
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="text-action"
                  onClick={() => setShowCustom(true)}
                >
                  <Plus size={14} />
                  新建原创特性或招式
                </button>
              )}
            </Section>
            <Section id="stats" title="种族值">
              <table className="stats-editor">
                <tbody>
                  {Object.entries(draft.stats).map(([name, value]) => {
                    const palette = statPalette[name];
                    return (
                      <tr
                        key={name}
                        style={{
                          "--stat-fill": palette.fill,
                          "--stat-light": palette.light,
                          "--stat-dark": palette.dark,
                        }}
                      >
                        <th>{name}</th>
                        <td>
                          <input
                            aria-label={`${name}种族值滑杆`}
                            type="range"
                            min="1"
                            max="255"
                            value={value}
                            onChange={(e) => updateStat(name, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`${name}种族值`}
                            type="number"
                            min="1"
                            max="255"
                            value={value}
                            onChange={(e) => updateStat(name, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th>总和</th>
                    <td colSpan="2">
                      {Object.values(draft.stats).reduce(
                        (sum, n) => sum + Number(n),
                        0,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Section>
            <Section id="publish" title="预览与发布">
              <Field label="原型剖析" wide>
                <textarea
                  rows="4"
                  value={draft.origin}
                  onChange={(e) => update("origin", e.target.value)}
                  placeholder="说明设计原型、命名来源与创作思路。"
                />
              </Field>
              <label className="publish-agreement">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span>
                  我确认拥有相关原创内容的发布权，并同意以 CC BY-NC-SA 3.0
                  协议共享。
                </span>
              </label>
              <div className="publish-actions">
                <button className="wiki-button" onClick={downloadJson}>
                  <Download size={15} />
                  下载 JSON
                </button>
                <button
                  className="wiki-button"
                  onClick={() => setShowArticlePreview(true)}
                >
                  页面预览
                </button>
                <button
                  className="wiki-button primary"
                  disabled={!accepted || !draft.name.trim()}
                  onClick={() => setShowWikiText(true)}
                >
                  生成 Wiki 文本
                </button>
              </div>
              {(!draft.name.trim() || !accepted) && (
                <small className="publish-help">
                  填写中文名并确认授权后即可生成。
                </small>
              )}
            </Section>
          </div>
          <WikiInfobox
            draft={draft}
            selectedItems={selectedItems}
            abilitySelection={abilitySelection}
            onImage={handleImage}
          />
        </div>
        <div className="article-footer">
          本工具使用{" "}
          <a href="https://wiki.52poke.com/" target="_blank" rel="noreferrer">
            神奇宝贝百科
          </a>{" "}
          的页面结构作为设计参考。引用内容应保留原始来源。
          <ExternalLink size={12} />
        </div>
      </article>
      <aside className="wiki-appearance">
        <strong>外观</strong>
        <button>隐藏</button>
        <div>
          <span>文字</span>
          <label>
            <input type="radio" name="textSize" />小
          </label>
          <label>
            <input type="radio" name="textSize" defaultChecked />
            标准
          </label>
          <label>
            <input type="radio" name="textSize" />大
          </label>
        </div>
      </aside>
      {showArticlePreview && (
        <WikiArticlePreview
          draft={draft}
          dexEntries={dexEntries}
          evolutionMethods={evolutionMethods}
          selectedItems={selectedItems}
          abilitySelection={abilitySelection}
          onClose={() => setShowArticlePreview(false)}
          onShowSource={() => {
            setShowArticlePreview(false);
            setShowWikiText(true);
          }}
        />
      )}
      {showWikiText && (
        <div
          className="wiki-modal-backdrop"
          role="presentation"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setShowWikiText(false)
          }
        >
          <section
            className="wiki-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            <header>
              <div>
                <h2 id="preview-title">Wiki 文本预览</h2>
                <p>复制后可粘贴到后续的百科子页面编辑器中。</p>
              </div>
              <button
                onClick={() => setShowWikiText(false)}
                aria-label="关闭预览"
              >
                <X size={20} />
              </button>
            </header>
            <textarea readOnly value={wikiText} />
            <footer>
              <button
                className="wiki-button quiet"
                onClick={() => setShowWikiText(false)}
              >
                返回修改
              </button>
              <button className="wiki-button primary" onClick={copyWikiText}>
                <Copy size={15} />
                复制 Wiki 文本
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
