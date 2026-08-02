import { useMemo } from "react";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { types } from "../data/library";
import {
  formatEvolutionCondition,
  getEvolutionEntryLabel,
  getMethodDefaults,
  normalizeEvolutionCondition,
} from "../data/evolution";

const timeOptions = ["不限", "清晨", "白天", "黄昏", "夜晚"];
const timeMoonOptions = [...timeOptions, "满月的夜晚"];
const formCategories = [
  "地区形态",
  "特殊形态",
  "超级进化",
  "超极巨化",
  "原始回归",
  "战斗形态",
  "其他形态",
];

function PokemonFormPicker({ value, onChange, dexEntries, optional = false }) {
  const baseEntries = useMemo(
    () => dexEntries.filter((entry) => !entry.formLabel),
    [dexEntries],
  );
  const current = dexEntries.find((entry) => entry.slug === value);
  const selectedDex = current?.nationalDex || "";
  const forms = useMemo(
    () =>
      selectedDex
        ? dexEntries.filter(
            (entry) =>
              entry.nationalDex === Number(selectedDex) && entry.formLabel,
          )
        : [],
    [dexEntries, selectedDex],
  );
  const base = baseEntries.find(
    (entry) => entry.nationalDex === Number(selectedDex),
  );

  return (
    <div className="pokemon-form-picker">
      <select
        aria-label="宝可梦物种"
        value={selectedDex}
        onChange={(event) => {
          const next = baseEntries.find(
            (entry) => entry.nationalDex === Number(event.target.value),
          );
          onChange(next?.slug || "");
        }}
      >
        <option value="">{optional ? "不指定宝可梦" : "选择宝可梦"}</option>
        {baseEntries.map((entry) => (
          <option value={entry.nationalDex} key={entry.slug}>
            {String(entry.nationalDex).padStart(4, "0")} ·{" "}
            {entry.names["zh-Hans"]}
          </option>
        ))}
      </select>
      {selectedDex && (
        <select
          aria-label="地区或特殊形态"
          value={current?.formLabel ? current.slug : ""}
          onChange={(event) => onChange(event.target.value || base?.slug || "")}
        >
          <option value="">通常形态</option>
          {forms.map((entry) => (
            <option value={entry.slug} key={entry.slug}>
              {entry.formClass ? `${entry.formClass} · ` : ""}
              {entry.formLabel}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function EvolutionField({ field, value, onChange, dexEntries, moves }) {
  const common = {
    value: value || "",
    onChange: (event) => onChange(event.target.value),
  };

  let control;
  if (field.kind === "number") {
    control = (
      <input
        {...common}
        type="number"
        min={field.min}
        max={field.max}
        placeholder={field.placeholder}
      />
    );
  } else if (field.kind === "time" || field.kind === "time-moon") {
    const options = field.kind === "time-moon" ? timeMoonOptions : timeOptions;
    control = (
      <select {...common}>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === "type") {
    control = (
      <select {...common}>
        {field.optional && <option value="">不指定</option>}
        {types.map((type) => (
          <option value={type} key={type}>
            {type}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === "pokemon") {
    control = (
      <PokemonFormPicker
        value={value || ""}
        onChange={onChange}
        dexEntries={dexEntries}
        optional={field.optional}
      />
    );
  } else if (field.kind === "move") {
    control = (
      <>
        <input
          {...common}
          list="evolution-move-options"
          placeholder={field.placeholder}
        />
        <datalist id="evolution-move-options">
          {moves.map((move) => (
            <option value={move.name} key={move.id} />
          ))}
        </datalist>
      </>
    );
  } else if (field.kind === "textarea") {
    control = <textarea {...common} rows="2" placeholder={field.placeholder} />;
  } else {
    control = <input {...common} placeholder={field.placeholder} />;
  }

  return (
    <label
      className={`evolution-field ${field.kind === "pokemon" ? "wide" : ""}`}
    >
      <span>
        {field.label}
        {field.optional && <small>可选</small>}
      </span>
      {control}
    </label>
  );
}

export function EvolutionEditor({
  draft,
  setDraft,
  dexEntries,
  evolutionMethods,
  resources,
}) {
  const condition = normalizeEvolutionCondition(
    draft.evolutionCondition,
    draft.evolutionMethod,
  );
  const method = evolutionMethods.find((item) => item.id === condition.method);
  const existing = dexEntries.find(
    (entry) => entry.slug === draft.evolutionBase,
  );
  const relationshipMode = draft.relationshipMode || "evolution";
  const direction = draft.evolutionDirection || "into-custom";
  const moves = resources.filter((item) => item.kind === "招式");
  const groupedMethods = useMemo(
    () =>
      evolutionMethods.reduce((groups, item) => {
        (groups[item.group] ||= []).push(item);
        return groups;
      }, {}),
    [evolutionMethods],
  );

  const updateCondition = (nextCondition) =>
    setDraft((current) => ({
      ...current,
      evolutionMethod: "",
      evolutionCondition: nextCondition,
    }));
  const updateValue = (key, value) =>
    updateCondition({
      ...condition,
      values: { ...condition.values, [key]: value },
    });
  const customName = draft.name || "未命名原创宝可梦";
  const existingName = getEvolutionEntryLabel(existing);
  const leftName = direction === "into-custom" ? existingName : customName;
  const rightName = direction === "into-custom" ? customName : existingName;
  const customFormName = existing
    ? `${existing.names?.["zh-Hans"] || existingName}（${draft.formLabel?.trim() || "未命名原创形态"}）`
    : "未选择关联物种";

  return (
    <div className="evolution-editor">
      <div
        className="relationship-mode-tabs"
        role="group"
        aria-label="关系类型"
      >
        <button
          type="button"
          className={relationshipMode === "evolution" ? "active" : ""}
          aria-pressed={relationshipMode === "evolution"}
          onClick={() =>
            setDraft((current) => ({
              ...current,
              relationshipMode: "evolution",
            }))
          }
        >
          进化关系
        </button>
        <button
          type="button"
          className={relationshipMode === "form" ? "active" : ""}
          aria-pressed={relationshipMode === "form"}
          onClick={() =>
            setDraft((current) => ({
              ...current,
              relationshipMode: "form",
            }))
          }
        >
          作为已有宝可梦的特殊形态
        </button>
      </div>

      {relationshipMode === "form" ? (
        <div className="form-association-panel">
          <label className="form-base-picker">
            <span>关联原物种</span>
            <PokemonFormPicker
              value={draft.evolutionBase}
              onChange={(value) =>
                setDraft((current) => ({ ...current, evolutionBase: value }))
              }
              dexEntries={dexEntries}
            />
          </label>
          <div className="form-association-fields">
            <label>
              <span>形态类别</span>
              <select
                value={draft.formCategory || "地区形态"}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    formCategory: event.target.value,
                  }))
                }
              >
                {formCategories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>原创形态名称</span>
              <input
                value={draft.formLabel || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    formLabel: event.target.value,
                  }))
                }
                placeholder="例如：阿罗拉的样子、苍焰形态"
              />
            </label>
          </div>
          <p>
            特殊形态仍属于关联物种；“中文名”可保留为创作页标题，正式形态名称以上方字段为准。
          </p>
        </div>
      ) : (
        <>
          <div className="evolution-relation-row">
            <label>
              <span>关联方向</span>
              <select
                value={direction}
                disabled={!draft.evolutionBase}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    evolutionDirection: event.target.value,
                  }))
                }
              >
                <option value="into-custom">已有宝可梦 → 原创宝可梦</option>
                <option value="from-custom">原创宝可梦 → 已有宝可梦</option>
              </select>
            </label>
            <label className="wide">
              <span>关联已有宝可梦</span>
              <PokemonFormPicker
                value={draft.evolutionBase}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, evolutionBase: value }))
                }
                dexEntries={dexEntries}
                optional
              />
            </label>
          </div>

          <div className="evolution-method-panel">
            <label className="evolution-method-select">
              <span>进化方式</span>
              <select
                value={condition.method}
                onChange={(event) => {
                  const nextMethod = evolutionMethods.find(
                    (item) => item.id === event.target.value,
                  );
                  updateCondition({
                    method: nextMethod?.id || "",
                    values: getMethodDefaults(nextMethod),
                  });
                }}
              >
                <option value="">请选择进化方式</option>
                {Object.entries(groupedMethods).map(([group, methods]) => (
                  <optgroup label={group} key={group}>
                    {methods.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <small>
                {method?.description ||
                  "从 52poke 当前进化模板中选择统一方式。"}
              </small>
            </label>

            {method && method.fields.length > 0 && (
              <div className="evolution-condition-grid">
                {method.fields.map((field) => (
                  <EvolutionField
                    key={field.key}
                    field={field}
                    value={condition.values[field.key]}
                    onChange={(value) => updateValue(field.key, value)}
                    dexEntries={dexEntries}
                    moves={moves}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div
        className={`evolution-preview ${relationshipMode === "form" ? "form-linked" : draft.evolutionBase ? "linked" : "standalone"}`}
      >
        {relationshipMode === "form" && draft.evolutionBase ? (
          <>
            <strong>{existingName}</strong>
            <span>
              <ArrowLeftRight size={18} />
              <small>{draft.formCategory || "特殊形态"}</small>
            </span>
            <strong>{customFormName}</strong>
          </>
        ) : relationshipMode === "form" ? (
          <>
            <strong>请选择关联原物种</strong>
            <span>原创特殊形态</span>
          </>
        ) : draft.evolutionBase ? (
          <>
            <strong>{leftName}</strong>
            <span>
              <ChevronRight size={18} />
              <small>
                {formatEvolutionCondition(
                  condition,
                  evolutionMethods,
                  dexEntries,
                )}
              </small>
            </span>
            <strong>{rightName}</strong>
          </>
        ) : (
          <>
            <strong>{customName}</strong>
            <span>原创独立进化链</span>
          </>
        )}
      </div>
      <p className="evolution-source-note">
        已载入 {evolutionMethods.length} 类进化方式、
        {Math.max(0, dexEntries.length - 1025)}{" "}
        个地区／特殊形态；条件仍可使用“其他／特殊条件”完整改写。
      </p>
    </div>
  );
}
