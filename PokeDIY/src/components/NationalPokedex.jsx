import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Dna,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { getTypePalette, StatMeter, TypeBadge, TypeIcon } from "./PokemonDecor";

const TYPES = ["一般", "格斗", "飞行", "毒", "地面", "岩石", "虫", "幽灵", "钢", "火", "水", "草", "电", "超能力", "冰", "龙", "恶", "妖精"];
const REGIONS = [
  ["关都", 1], ["城都", 2], ["丰缘", 3], ["神奥", 4], ["合众", 5],
  ["卡洛斯", 6], ["阿罗拉", 7], ["伽勒尔／洗翠", 8], ["帕底亚", 9],
];
const REGION_BY_GENERATION = Object.fromEntries(REGIONS.map(([name, generation]) => [generation, name]));
const PAGE_SIZE = 60;
const ARTWORK_ROOT = "/assets/pokemon-art";

function artworkUrl(entry) {
  return `${ARTWORK_ROOT}/${entry.nationalDex}.webp`;
}

function sectionUrl(entry, section) {
  return `${entry.wikiUrl}#${encodeURIComponent(section)}`;
}

function hasTag(entry, tag) {
  if (tag === "地区形态") return Boolean(entry.formLabel);
  const tags = entry.tags || [];
  if (tag === "初始伙伴") return tags.includes("初");
  if (tag === "传说") return tags.includes("传");
  if (tag === "幻之") return tags.includes("幻");
  return false;
}

function DetailLink({ href, className, icon: Icon, title, children }) {
  return (
    <a className={`dex-detail-section ${className}`} href={href} target="_blank" rel="noreferrer">
      <h3><Icon size={16} />{title}<span>查看栏目</span></h3>
      {children}
    </a>
  );
}

function EvolutionContent({ entry, detail }) {
  const stages = [detail?.evolution?.previous, { nationalDex: entry.nationalDex, name: entry.names["zh-Hans"], current: true }, ...(detail?.evolution?.next || []).slice(0, 2)].filter(Boolean);
  return (
    <div className="dex-evolution-line">
      {stages.length === 1 ? <p>暂未发现进化关系</p> : stages.map((stage, index) => (
        <div className={stage.current ? "current" : ""} key={`${stage.nationalDex}-${index}`}>
          {index > 0 && <span className="dex-evolution-method">{stage.method || "现在"}</span>}
          <img src={`${ARTWORK_ROOT}/${stage.nationalDex}.webp`} alt="" loading="lazy" />
          <b>{stage.name}</b>
        </div>
      ))}
    </div>
  );
}

function DexDetailCard({ entry, detail, placement, mobile, onClose }) {
  const abilities = detail?.abilities || [];
  const commonAbilities = abilities.filter((item) => !item.hidden).slice(0, 2);
  const hiddenAbility = abilities.find((item) => item.hidden);
  const palette = getTypePalette(entry.typesZhHans?.[0]);
  const style = {
    "--dex-main": palette.main,
    "--dex-light": palette.light,
    "--dex-dark": palette.dark,
    ...(mobile ? {} : { left: placement.left, top: placement.top }),
  };

  return (
    <aside className={`dex-detail-card ${mobile ? "mobile" : ""}`} style={style} aria-label={`${entry.names["zh-Hans"]}详情`}>
      {mobile && <button className="dex-detail-close" onClick={onClose} aria-label="关闭详情"><X size={20} /></button>}
      <a className="dex-detail-head" href={entry.wikiUrl} target="_blank" rel="noreferrer">
        <div>
          <small>全国图鉴 #{String(entry.nationalDex).padStart(4, "0")}</small>
          <h2>{entry.names["zh-Hans"]}</h2>
          {entry.formLabel && <p>{entry.formLabel}</p>}
        </div>
        <img src={artworkUrl(entry)} alt="" />
      </a>
      <div className="dex-detail-grid">
        <DetailLink className="description" href={sectionUrl(entry, "图鉴介绍")} icon={BookOpenText} title="图鉴描述">
          <p>{detail?.description || "暂无图鉴说明。"}</p>
          <dl><div><dt>身高</dt><dd>{detail?.height ? `${(detail.height / 10).toFixed(1)} m` : "—"}</dd></div><div><dt>体重</dt><dd>{detail?.weight ? `${(detail.weight / 10).toFixed(1)} kg` : "—"}</dd></div></dl>
        </DetailLink>
        <DetailLink className="abilities" href={sectionUrl(entry, "特性")} icon={Sparkles} title="特性">
          <div className="dex-ability-list">
            {commonAbilities.map((ability, index) => <span key={ability.name}><b>{index === 0 ? "A" : "B"}</b>{ability.name}</span>)}
            {hiddenAbility && <span className="hidden"><b>隐</b>{hiddenAbility.name}</span>}
            {!abilities.length && <span>暂无数据</span>}
          </div>
        </DetailLink>
        <DetailLink className="stats" href={sectionUrl(entry, "种族值")} icon={Dna} title={`种族值 ${detail?.statTotal || "—"}`}>
          <div className="dex-stat-list">
            {Object.entries(detail?.stats || {}).map(([name, value]) => <StatMeter name={name} value={value} key={name} />)}
          </div>
        </DetailLink>
        <DetailLink className="evolution" href={sectionUrl(entry, "进化")} icon={MapPin} title="进化关系">
          <EvolutionContent entry={entry} detail={detail} />
        </DetailLink>
      </div>
    </aside>
  );
}

function DexCard({ entry, detail, onMobileOpen }) {
  const [active, setActive] = useState(false);
  const [placement, setPlacement] = useState({ left: 0, top: 104 });
  const cardRef = useRef(null);
  const palette = getTypePalette(entry.typesZhHans?.[0]);
  const style = { "--dex-main": palette.main, "--dex-light": palette.light, "--dex-dark": palette.dark };

  const openDesktop = () => {
    if (window.matchMedia("(hover: none), (max-width: 760px)").matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const panelWidth = 566;
    const panelHeight = 450;
    const roomRight = window.innerWidth - rect.right;
    setPlacement({
      left: roomRight > panelWidth + 18 ? rect.right + 12 : Math.max(12, rect.left - panelWidth - 12),
      top: Math.min(Math.max(92, rect.top - 20), window.innerHeight - panelHeight - 12),
    });
    setActive(true);
  };

  const handleClick = () => {
    if (window.matchMedia("(hover: none), (max-width: 760px)").matches) onMobileOpen(entry);
  };

  return (
    <article
      className="dex-card"
      style={style}
      ref={cardRef}
      tabIndex="0"
      onMouseEnter={openDesktop}
      onMouseLeave={() => setActive(false)}
      onFocus={openDesktop}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setActive(false); }}
      onClick={handleClick}
      aria-label={`查看${entry.names["zh-Hans"]}详情`}
    >
      <div className="dex-card-title"><strong>{entry.names["zh-Hans"]}</strong><span>#{String(entry.nationalDex).padStart(4, "0")}</span></div>
      {entry.formLabel && <span className="dex-form-label">{entry.formLabel}</span>}
      <div className="dex-artwork-wrap"><img src={artworkUrl(entry)} alt={entry.names["zh-Hans"]} loading="lazy" /></div>
      <div className="dex-card-meta">
        <div>{entry.typesZhHans.map((type) => <TypeBadge type={type} compact key={type} />)}</div>
        <span><MapPin size={12} />{REGION_BY_GENERATION[entry.generation]}</span>
      </div>
      {active && <DexDetailCard entry={entry} detail={detail} placement={placement} />}
    </article>
  );
}

function FilterRow({ label, children }) {
  return <div className="dex-filter-row"><strong>{label}</strong><div>{children}</div></div>;
}

function FilterButton({ active, onClick, children, count }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{children}{count !== undefined && <small>{count}</small>}</button>;
}

export function NationalPokedex({ onOpenEditor }) {
  const [entries, setEntries] = useState([]);
  const [details, setDetails] = useState({});
  const [query, setQuery] = useState("");
  const [type, setType] = useState("全部");
  const [region, setRegion] = useState("全部");
  const [category, setCategory] = useState("全部");
  const [sort, setSort] = useState("asc");
  const [page, setPage] = useState(1);
  const [mobileEntry, setMobileEntry] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/national/national-pokedex.json").then((response) => response.json()),
      fetch("/national/pokemon-card-details.json").then((response) => response.json()),
    ]).then(([national, cardDetails]) => {
      const combined = [
        ...(national.entries || []),
        ...(national.alternateForms || []).map((entry) => ({ ...entry, formClass: "地区形态" })),
      ];
      combined.sort((a, b) => a.nationalDex - b.nationalDex || Boolean(a.formLabel) - Boolean(b.formLabel));
      setEntries(combined);
      setDetails(cardDetails.entries || {});
    });
  }, []);

  useEffect(() => { setPage(1); }, [query, type, region, category, sort]);
  useEffect(() => {
    const close = (event) => { if (event.key === "Escape") setMobileEntry(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const counts = useMemo(() => ({
    types: Object.fromEntries(TYPES.map((value) => [value, entries.filter((entry) => entry.typesZhHans?.includes(value)).length])),
    regions: Object.fromEntries(REGIONS.map(([name, generation]) => [name, entries.filter((entry) => entry.generation === generation).length])),
    categories: Object.fromEntries(["初始伙伴", "传说", "幻之", "地区形态"].map((value) => [value, entries.filter((entry) => hasTag(entry, value)).length])),
  }), [entries]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase().replace(/^#/, "");
    const output = entries.filter((entry) => {
      const searchable = [entry.nationalDex, entry.names["zh-Hans"], entry.names.ja, entry.names.en, entry.formLabel].join(" ").toLowerCase();
      return (!normalized || searchable.includes(normalized))
        && (type === "全部" || entry.typesZhHans?.includes(type))
        && (region === "全部" || REGION_BY_GENERATION[entry.generation] === region)
        && (category === "全部" || hasTag(entry, category));
    });
    output.sort((a, b) => sort === "desc"
      ? b.nationalDex - a.nationalDex
      : a.nationalDex - b.nationalDex || Boolean(a.formLabel) - Boolean(b.formLabel));
    return output;
  }, [entries, query, type, region, category, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clearFilters = () => { setQuery(""); setType("全部"); setRegion("全部"); setCategory("全部"); setSort("asc"); };

  return (
    <main className="dex-page">
      <div className="dex-breadcrumb"><a href="https://wiki.52poke.com/" target="_blank" rel="noreferrer">神奇宝贝百科</a><span>›</span><strong>全国图鉴</strong></div>
      <header className="dex-page-head">
        <div><p>POKÉDIY DATABASE</p><h1>全国图鉴</h1><span>从第一世代到第九世代，按属性、地区与分类浏览已有宝可梦。</span></div>
        <button className="wiki-button primary" onClick={onOpenEditor}>制作我的宝可梦</button>
      </header>
      <nav className="dex-tabs" aria-label="PokeDIY页面"><a className="active" href="#pokedex">全国图鉴</a><button onClick={onOpenEditor}>DIY创作台</button><a href="https://wiki.52poke.com/wiki/%E5%AE%9D%E5%8F%AF%E6%A2%A6%E5%88%97%E8%A1%A8%EF%BC%88%E6%8C%89%E5%85%A8%E5%9B%BD%E5%9B%BE%E9%89%B4%E7%BC%96%E5%8F%B7%EF%BC%89" target="_blank" rel="noreferrer">百科原始列表</a></nav>
      <section className="dex-license"><BookOpenText size={16} /><p><strong>数据来源与许可</strong> 名称与百科链接来自神奇宝贝百科，遵循 CC BY-NC-SA 3.0；结构化资料与立绘分别由 PokeAPI 数据库及 sprites 仓库提供。角色图像版权归其权利人所有。</p></section>

      <section className="dex-filters" aria-label="图鉴筛选">
        <div className="dex-filter-top">
          <label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、英文名或全国编号" aria-label="搜索宝可梦" /></label>
          <div><ArrowDownAZ size={16} /><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="排序"><option value="asc">编号从小到大</option><option value="desc">编号从大到小</option></select></div>
          <button onClick={clearFilters}><X size={15} />重置筛选</button>
        </div>
        <FilterRow label="属性">
          <FilterButton active={type === "全部"} onClick={() => setType("全部")} count={entries.length}>全部</FilterButton>
          {TYPES.map((value) => <FilterButton active={type === value} onClick={() => setType(value)} count={counts.types[value]} key={value}><TypeIcon type={value} size={16} />{value}</FilterButton>)}
        </FilterRow>
        <FilterRow label="地区">
          <FilterButton active={region === "全部"} onClick={() => setRegion("全部")}>全部</FilterButton>
          {REGIONS.map(([name]) => <FilterButton active={region === name} onClick={() => setRegion(name)} count={counts.regions[name]} key={name}>{name}</FilterButton>)}
        </FilterRow>
        <FilterRow label="分类">
          {['全部', '初始伙伴', '传说', '幻之', '地区形态'].map((value) => <FilterButton active={category === value} onClick={() => setCategory(value)} count={value === '全部' ? undefined : counts.categories[value]} key={value}>{value}</FilterButton>)}
        </FilterRow>
      </section>

      <div className="dex-results-head"><p><SlidersHorizontal size={16} />找到 <strong>{filtered.length}</strong> 个结果</p><span>将鼠标移到卡片上查看详情；触屏设备轻点卡片</span></div>
      {pageEntries.length ? (
        <section className="dex-grid" aria-live="polite">
          {pageEntries.map((entry) => <DexCard entry={entry} detail={details[String(entry.nationalDex)]} onMobileOpen={setMobileEntry} key={`${entry.nationalDex}-${entry.formLabel || "base"}`} />)}
        </section>
      ) : <div className="dex-empty"><Search size={28} /><h2>没有找到符合条件的宝可梦</h2><button className="wiki-button" onClick={clearFilters}>清除筛选</button></div>}

      <footer className="dex-pagination">
        <button disabled={page === 1} onClick={() => { setPage((value) => value - 1); window.scrollTo({ top: 470, behavior: "smooth" }); }}><ChevronLeft size={17} />上一页</button>
        <span>第 <strong>{page}</strong> / {pageCount} 页</span>
        <button disabled={page === pageCount} onClick={() => { setPage((value) => value + 1); window.scrollTo({ top: 470, behavior: "smooth" }); }}>下一页<ChevronRight size={17} /></button>
      </footer>

      {mobileEntry && <div className="dex-mobile-scrim" onClick={() => setMobileEntry(null)}><div onClick={(event) => event.stopPropagation()}><DexDetailCard entry={mobileEntry} detail={details[String(mobileEntry.nationalDex)]} mobile onClose={() => setMobileEntry(null)} /></div></div>}
    </main>
  );
}
