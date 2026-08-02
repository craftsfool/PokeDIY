import { ArrowLeft, Code2, ExternalLink, List, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatEvolutionCondition,
  getEvolutionEntryLabel,
} from "../data/evolution";
import { types } from "../data/library";
import {
  getMoveMeta,
  getTypePalette,
  MoveCategoryBadge,
  statPalette,
  TypeBadge,
} from "./PokemonDecor";
import { WikiHeader } from "./WikiHeader";
import { WikiInfobox } from "./WikiInfobox";

const relevantSections = [
  ["article-overview", "概述", "1"],
  ["article-game", "游戏中", "2"],
  ["article-stats", "种族值", "2.1", true],
  ["article-dex", "图鉴介绍", "2.2", true],
  ["article-matchup", "属性相性", "2.3", true],
  ["article-moves", "可学会招式表", "2.4", true],
  ["article-relation", "进化／形态", "3"],
  ["article-appearance", "形象", "4"],
  ["article-names", "名字", "5"],
  ["article-origin", "原型剖析", "6"],
  ["article-details", "细节", "7"],
];

const defenseChart = {
  一般: { weak: ["格斗"], immune: ["幽灵"] },
  火: {
    weak: ["水", "地面", "岩石"],
    resist: ["火", "草", "冰", "虫", "钢", "妖精"],
  },
  水: { weak: ["电", "草"], resist: ["火", "水", "冰", "钢"] },
  电: { weak: ["地面"], resist: ["电", "飞行", "钢"] },
  草: {
    weak: ["火", "冰", "毒", "飞行", "虫"],
    resist: ["水", "电", "草", "地面"],
  },
  冰: { weak: ["火", "格斗", "岩石", "钢"], resist: ["冰"] },
  格斗: {
    weak: ["飞行", "超能力", "妖精"],
    resist: ["虫", "岩石", "恶"],
  },
  毒: {
    weak: ["地面", "超能力"],
    resist: ["草", "格斗", "毒", "虫", "妖精"],
  },
  地面: {
    weak: ["水", "草", "冰"],
    resist: ["毒", "岩石"],
    immune: ["电"],
  },
  飞行: {
    weak: ["电", "冰", "岩石"],
    resist: ["草", "格斗", "虫"],
    immune: ["地面"],
  },
  超能力: {
    weak: ["虫", "幽灵", "恶"],
    resist: ["格斗", "超能力"],
  },
  虫: {
    weak: ["火", "飞行", "岩石"],
    resist: ["草", "格斗", "地面"],
  },
  岩石: {
    weak: ["水", "草", "格斗", "地面", "钢"],
    resist: ["一般", "火", "毒", "飞行"],
  },
  幽灵: {
    weak: ["幽灵", "恶"],
    resist: ["毒", "虫"],
    immune: ["一般", "格斗"],
  },
  龙: {
    weak: ["冰", "龙", "妖精"],
    resist: ["火", "水", "电", "草"],
  },
  恶: {
    weak: ["格斗", "虫", "妖精"],
    resist: ["幽灵", "恶"],
    immune: ["超能力"],
  },
  钢: {
    weak: ["火", "格斗", "地面"],
    resist: [
      "一般",
      "草",
      "冰",
      "飞行",
      "超能力",
      "虫",
      "岩石",
      "龙",
      "钢",
      "妖精",
    ],
    immune: ["毒"],
  },
  妖精: {
    weak: ["毒", "钢"],
    resist: ["格斗", "虫", "恶"],
    immune: ["龙"],
  },
};

function getDefensiveMultiplier(attackingType, defendingTypes) {
  return defendingTypes.reduce((multiplier, defendingType) => {
    const chart = defenseChart[defendingType] || {};
    if (chart.immune?.includes(attackingType)) return 0;
    if (chart.weak?.includes(attackingType)) return multiplier * 2;
    if (chart.resist?.includes(attackingType)) return multiplier * 0.5;
    return multiplier;
  }, 1);
}

function multiplierLabel(value) {
  if (value === 0.25) return "¼×";
  if (value === 0.5) return "½×";
  return `${value}×`;
}

function ArticleHeading({ id, children, level = 2 }) {
  const Tag = level === 3 ? "h3" : "h2";
  return (
    <Tag className={`article-section-heading level-${level}`} id={id}>
      <span>{children}</span>
      <a href={`#${id}`}>编辑</a>
    </Tag>
  );
}

function StatTable({ stats }) {
  const total = Object.values(stats).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
  return (
    <table className="article-stat-table">
      <thead>
        <tr>
          <th>能力</th>
          <th>种族值</th>
          <th>范围</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(stats).map(([name, value]) => {
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
                <b>{value}</b>
              </td>
              <td>
                <i>
                  <span
                    style={{ width: `${Math.min(Number(value) / 2.55, 100)}%` }}
                  />
                </i>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <th>总和</th>
          <td colSpan="2">{total}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function EvolutionPreview({ draft, dexEntries, evolutionMethods }) {
  const existingEntry = dexEntries.find(
    (entry) => entry.slug === draft.evolutionBase,
  );
  const existingName = getEvolutionEntryLabel(existingEntry);
  const customName = draft.name || "未命名宝可梦";

  if (!existingEntry) {
    return (
      <div className="article-relation-box standalone">
        <strong>{customName}</strong>
        <span>原创独立设定，尚未关联原版宝可梦。</span>
      </div>
    );
  }

  if (draft.relationshipMode === "form") {
    return (
      <div className="article-form-box">
        <div>
          <span>原物种</span>
          <a href={existingEntry.wikiUrl} target="_blank" rel="noreferrer">
            {existingName}
          </a>
        </div>
        <b>＋</b>
        <div>
          <span>{draft.formCategory || "特殊形态"}</span>
          <strong>{draft.formLabel || customName}</strong>
        </div>
      </div>
    );
  }

  const condition = formatEvolutionCondition(
    draft.evolutionCondition,
    evolutionMethods,
    dexEntries,
  );
  const fromCustom = draft.evolutionDirection === "from-custom";
  return (
    <div className="article-relation-box">
      <strong>{fromCustom ? customName : existingName}</strong>
      <span>
        <small>{condition}</small>
        <b>→</b>
      </span>
      <strong>{fromCustom ? existingName : customName}</strong>
    </div>
  );
}

export function WikiArticlePreview({
  draft,
  dexEntries,
  evolutionMethods,
  selectedItems,
  abilitySelection,
  onClose,
  onShowSource,
}) {
  const [tocOpen, setTocOpen] = useState(false);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const moves = useMemo(
    () =>
      selectedItems
        .filter((item) => item.kind === "招式")
        .sort((a, b) => {
          const rank = (item) => {
            const method = String(draft.learnMethods?.[item.id] || "-");
            if (method === "进化") return -1;
            if (/^\d+$/.test(method)) return Number(method);
            return 999;
          };
          return rank(a) - rank(b) || a.name.localeCompare(b.name, "zh-CN");
        }),
    [draft.learnMethods, selectedItems],
  );
  const abilities = selectedItems.filter((item) => item.kind === "特性");
  const abilityById = new Map(abilities.map((item) => [item.id, item]));
  const normalAbilities = (abilitySelection.regular || [])
    .map((id) => abilityById.get(id))
    .filter(Boolean);
  const hiddenAbility = abilityById.get(abilitySelection.hidden);
  const matchup = types.map((type) => ({
    type,
    multiplier: getDefensiveMultiplier(type, draft.types),
  }));
  const name = draft.name || "未命名宝可梦";
  const relationTitle = draft.relationshipMode === "form" ? "形态" : "进化";

  return (
    <div className="article-preview-overlay" role="dialog" aria-modal="true">
      <WikiHeader />
      <main className="article-preview-layout">
        <aside
          className={`wiki-toc article-preview-toc${tocOpen ? " open" : ""}`}
        >
          <div>
            <strong>目录</strong>
            <button type="button">隐藏</button>
          </div>
          <ol>
            {relevantSections.map(([id, label, number, nested]) => (
              <li className={nested ? "nested" : ""} key={id}>
                <a href={`#${id}`} onClick={() => setTocOpen(false)}>
                  <span>{number}</span>
                  {id === "article-relation" ? relationTitle : label}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <article className="wiki-article rendered-wiki-article">
          <div className="article-title-row">
            <button
              className="article-mobile-toc-button"
              type="button"
              onClick={() => setTocOpen((open) => !open)}
              aria-expanded={tocOpen}
              aria-label="打开条目目录"
            >
              <List size={23} />
            </button>
            <h1>{name}</h1>
            <span>原创宝可梦</span>
          </div>
          <div className="article-tabs rendered-tabs">
            <div>
              <a className="active">条目</a>
              <a>讨论</a>
            </div>
            <div>
              <a className="active">阅读</a>
              <button type="button" onClick={onShowSource}>
                <Code2 size={13} /> 查看源代码
              </button>
              <button type="button" onClick={onClose}>
                <ArrowLeft size={13} /> 返回编辑
              </button>
            </div>
          </div>

          <div className="rendered-article-notice">
            <strong>原创内容</strong>
            <span>
              本条目是玩家自行创作的宝可梦设定，不属于官方全国图鉴内容。
            </span>
          </div>

          <div className="rendered-article-body">
            <div className="article-preview-infobox">
              <WikiInfobox
                draft={draft}
                selectedItems={selectedItems}
                abilitySelection={abilitySelection}
                readOnly
                showStats={false}
                linkTargets={{
                  basic: "#article-game",
                  abilities: "#article-game",
                  stats: "#article-stats",
                }}
              />
            </div>

            <p className="article-lead">
              <b>{name}</b>
              {draft.jaName ? `（日文︰${draft.jaName}` : "（日文名未填写"}
              {draft.enName ? `，英文︰${draft.enName}` : "，英文名未填写"}
              ）是由社区用户创作的
              {draft.types.length
                ? `${draft.types.join("／")}属性`
                : "属性未定的"}
              宝可梦。
            </p>

            <ArticleHeading id="article-overview">概述</ArticleHeading>
            <p>
              {name}被归类为“{draft.category || "分类未定"}”。
              {draft.height && `身高为${draft.height}米，`}
              {draft.weight && `体重为${draft.weight}千克。`}
              {!draft.height && !draft.weight && "身高与体重尚未设定。"}
            </p>

            <ArticleHeading id="article-game">游戏中</ArticleHeading>
            <p>
              {normalAbilities.length ? (
                <>
                  普通特性为
                  {normalAbilities.map((ability, index) => (
                    <span key={ability.id}>
                      {index > 0 && "或"}
                      <a href={ability.wikiUrl || "#article-game"}>
                        {ability.name}
                      </a>
                    </span>
                  ))}
                  。
                </>
              ) : (
                "普通特性尚未设定。"
              )}
              {hiddenAbility && (
                <>
                  隐藏特性为
                  <a href={hiddenAbility.wikiUrl || "#article-game"}>
                    {hiddenAbility.name}
                  </a>
                  。
                </>
              )}
            </p>

            <ArticleHeading id="article-stats" level={3}>
              种族值
            </ArticleHeading>
            <StatTable stats={draft.stats} />

            <ArticleHeading id="article-dex" level={3}>
              图鉴介绍
            </ArticleHeading>
            <table className="article-dex-table">
              <tbody>
                <tr>
                  <th>原创图鉴</th>
                  <td>{draft.description || "尚未填写图鉴说明。"}</td>
                </tr>
              </tbody>
            </table>

            <ArticleHeading id="article-matchup" level={3}>
              属性相性
            </ArticleHeading>
            {draft.types.length ? (
              <div className="article-matchup-grid">
                {matchup.map(({ type, multiplier }) => {
                  const palette = getTypePalette(type);
                  return (
                    <div
                      key={type}
                      className={`matchup-${String(multiplier).replace(".", "-")}`}
                      style={{ "--matchup-color": palette.light }}
                    >
                      <TypeBadge type={type} compact />
                      <b>{multiplierLabel(multiplier)}</b>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="article-empty">选择属性后会自动计算属性相性。</p>
            )}

            <ArticleHeading id="article-moves" level={3}>
              可学会招式表
            </ArticleHeading>
            <div className="article-table-scroll">
              <table className="article-move-table">
                <thead>
                  <tr>
                    <th>等级</th>
                    <th>招式</th>
                    <th>属性</th>
                    <th>分类</th>
                    <th>威力</th>
                    <th>命中</th>
                    <th>PP</th>
                  </tr>
                </thead>
                <tbody>
                  {moves.length ? (
                    moves.map((move) => {
                      const meta = getMoveMeta(move);
                      return (
                        <tr key={move.id}>
                          <td>{draft.learnMethods?.[move.id] || "-"}</td>
                          <th>
                            <a href={move.wikiUrl || "#article-moves"}>
                              {move.name}
                            </a>
                          </th>
                          <td>
                            <TypeBadge type={meta.type} compact />
                          </td>
                          <td>
                            <MoveCategoryBadge
                              category={meta.category}
                              compact
                            />
                          </td>
                          <td>{move.power || "—"}</td>
                          <td>{move.accuracy || "—"}</td>
                          <td>{move.pp || "—"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7">尚未添加可学会招式。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <ArticleHeading id="article-relation">
              {relationTitle}
            </ArticleHeading>
            <EvolutionPreview
              draft={draft}
              dexEntries={dexEntries}
              evolutionMethods={evolutionMethods}
            />

            <ArticleHeading id="article-appearance">形象</ArticleHeading>
            <p>
              {draft.artist
                ? `${name}的原创形象由${draft.artist}绘制。`
                : "形象作者尚未填写。"}
              {draft.formLabel && `该形态称为“${draft.formLabel}”。`}
            </p>

            <ArticleHeading id="article-names">名字</ArticleHeading>
            <table className="article-name-table">
              <thead>
                <tr>
                  <th>语言</th>
                  <th>名字</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>中文</th>
                  <td>{name}</td>
                  <td rowSpan="3">由创作者自行命名</td>
                </tr>
                <tr>
                  <th>日文</th>
                  <td>{draft.jaName || "未填写"}</td>
                </tr>
                <tr>
                  <th>英文</th>
                  <td>{draft.enName || "未填写"}</td>
                </tr>
              </tbody>
            </table>

            <ArticleHeading id="article-origin">原型剖析</ArticleHeading>
            <p>{draft.origin || "尚未填写设计原型与命名来源。"}</p>

            <ArticleHeading id="article-details">细节</ArticleHeading>
            <ul className="article-detail-list">
              <li>本条目记载的是玩家原创设定，并非官方宝可梦资料。</li>
              {draft.relationshipMode === "form" && draft.evolutionBase && (
                <li>
                  该设定作为{getEvolutionEntryLabel(
                    dexEntries.find(
                      (entry) => entry.slug === draft.evolutionBase,
                    ),
                  )}
                  的{draft.formCategory || "特殊形态"}收录。
                </li>
              )}
              <li>
                形象作者：{draft.artist || "未填写"}；内容以 CC BY-NC-SA 3.0
                协议发布。
              </li>
            </ul>
          </div>

          <footer className="rendered-article-footer">
            <p>
              本原创页面遵循
              <a
                href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-NC-SA 3.0
              </a>
              协议；引用的原版资料请保留神奇宝贝百科来源。
            </p>
            <a href="https://wiki.52poke.com/" target="_blank" rel="noreferrer">
              神奇宝贝百科 <ExternalLink size={12} />
            </a>
          </footer>
        </article>

        <aside className="wiki-appearance rendered-appearance">
          <strong>外观</strong>
          <button type="button">隐藏</button>
          <div>
            <span>文字</span>
            <label>
              <input type="radio" name="previewTextSize" />小
            </label>
            <label>
              <input type="radio" name="previewTextSize" defaultChecked />
              标准
            </label>
            <label>
              <input type="radio" name="previewTextSize" />大
            </label>
          </div>
        </aside>
      </main>
      <button
        className="article-preview-close"
        type="button"
        onClick={onClose}
        aria-label="关闭页面预览"
      >
        <X size={20} />
      </button>
    </div>
  );
}
