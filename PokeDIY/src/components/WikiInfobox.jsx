import { ImagePlus } from "lucide-react";
import { getTypePalette, StatMeter, TypeBadge, TypeIcon } from "./PokemonDecor";

export function WikiInfobox({
  draft,
  selectedItems,
  abilitySelection,
  onImage,
  readOnly = false,
  showStats = true,
  linkTargets = {},
}) {
  const abilities = selectedItems.filter((item) => item.kind === "特性");
  const abilityById = new Map(abilities.map((item) => [item.id, item]));
  const normalAbilities = (abilitySelection?.regular || [])
    .map((id) => abilityById.get(id))
    .filter(Boolean);
  const hiddenAbility = abilityById.get(abilitySelection?.hidden);
  const firstType = draft.types[0];
  const palette = getTypePalette(firstType);
  const basicLink = linkTargets.basic || "#basic";
  const abilitiesLink = linkTargets.abilities || "#abilities";
  return (
    <aside
      className="pokemon-infobox"
      aria-label="宝可梦信息框预览"
      style={{
        "--type-main": palette.main,
        "--type-soft": palette.light,
        "--type-dark": palette.dark,
      }}
    >
      <div className="infobox-name">
        <div>
          <strong>{draft.name || "未命名宝可梦"}</strong>
          <span>
            {draft.jaName || "日文名未填写"}　{draft.enName || "英文名未填写"}
          </span>
        </div>
        <b>
          {firstType ? (
            <TypeIcon type={firstType} />
          ) : (
            <span className="infobox-ball" aria-hidden="true" />
          )}
          <span>#DIY</span>
        </b>
      </div>
      <div
        className={`${draft.image ? "infobox-art has-art" : "infobox-art"}${readOnly ? " is-static" : ""}`}
        onClick={readOnly ? undefined : () => document.getElementById("infobox-image-input")?.click()}
      >
        {!readOnly && (
          <input
            id="infobox-image-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onImage}
          />
        )}
        {draft.image ? (
          <img
            src={draft.image}
            alt={`${draft.name || "原创宝可梦"}的形象设定`}
          />
        ) : (
          <span>
            <ImagePlus size={30} />
            <strong>{readOnly ? "尚未提供形象" : "上传原创形象"}</strong>
            <small>{readOnly ? "原创设定图" : "PNG、JPG 或 WebP"}</small>
          </span>
        )}
      </div>
      <div className="infobox-caption">
        原创设定图{draft.artist ? ` · ${draft.artist}` : ""}
      </div>
      <table>
        <tbody>
          <tr>
            <th>
              <a href={basicLink}>属性</a>
            </th>
            <td>
              {draft.types.length ? (
                <div className="infobox-types">
                  {draft.types.map((type) => (
                    <TypeBadge type={type} compact key={type} />
                  ))}
                </div>
              ) : (
                <em>未填写</em>
              )}
            </td>
            <th>
              <a href={basicLink}>分类</a>
            </th>
            <td>{draft.category || <em>未填写</em>}</td>
          </tr>
          <tr>
            <th>
              <a href={abilitiesLink}>特性</a>
            </th>
            <td colSpan={hiddenAbility ? 2 : 3}>
              {normalAbilities.length ? (
                normalAbilities.map((ability, index) => (
                  <span key={ability.id}>
                    {index > 0 && " 或 "}
                    <a className="info-link" href={abilitiesLink}>
                      {ability.name}
                    </a>
                  </span>
                ))
              ) : (
                <em>未选择</em>
              )}
            </td>
            {hiddenAbility && (
              <td className="infobox-hidden-ability">
                <a className="info-link" href={abilitiesLink}>
                  {hiddenAbility.name}
                </a>
                <small>隐藏特性</small>
              </td>
            )}
          </tr>
          <tr>
            <th>
              <a href={basicLink}>身高</a>
            </th>
            <td>{draft.height ? `${draft.height}m` : <em>未填写</em>}</td>
            <th>
              <a href={basicLink}>体重</a>
            </th>
            <td>{draft.weight ? `${draft.weight}kg` : <em>未填写</em>}</td>
          </tr>
        </tbody>
      </table>
      {showStats && (
        <div className="stat-preview">
          <strong>种族值</strong>
          {Object.entries(draft.stats).map(([name, value]) => (
            <StatMeter name={name} value={value} key={name} />
          ))}
        </div>
      )}
    </aside>
  );
}
