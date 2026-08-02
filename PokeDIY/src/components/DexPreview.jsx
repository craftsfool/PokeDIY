import { ImagePlus, Ruler, Weight } from 'lucide-react'
import { library } from '../data/library'

export function DexPreview({ draft, onNext }) {
  const items = [...library, ...draft.custom].filter(item => draft.selected.includes(item.id))
  const abilities = items.filter(item => item.kind === '特性')
  const moves = items.filter(item => item.kind === '招式')
  return (
    <aside className="preview-panel" id="preview">
      <div className="preview-heading"><span>实时图鉴预览</span><small>FAN DEX · 未发布</small></div>
      <div className="creature-image">
        {draft.image ? <img src={draft.image} alt={`${draft.name}的原创形象设定`} /> : (
          <div className="seedling-placeholder" aria-label="等待上传原创形象">
            <i className="leaf left"/><i className="leaf right"/><i className="stem"/><i className="body"/><i className="eye one"/><i className="eye two"/>
            <span><ImagePlus size={15} />等待上传形象设定</span>
          </div>
        )}
      </div>
      <div className="dex-title"><div><h2>{draft.name || '未命名'}</h2><p>{draft.category || '原创宝可梦'}</p></div><strong>NO. DIY—001</strong></div>
      <div className="type-row">{draft.types.map(type => <span key={type} data-type={type}>{type}</span>)}</div>
      <div className="measure-row"><span><Ruler size={15} />身高 {draft.height || '—'} m</span><span><Weight size={15} />体重 {draft.weight || '—'} kg</span></div>
      <p className="dex-copy">{draft.description || '完成基础资料后，图鉴说明会显示在这里。'}</p>
      <section className="preview-section"><h3>种族值</h3><div className="stats">{Object.entries(draft.stats).map(([key, value]) => <div key={key}><span>{key}</span><i><b style={{width: `${Math.min(value / 1.25, 100)}%`}}/></i><strong>{value}</strong></div>)}</div></section>
      <section className="preview-section"><h3>特性</h3><div className="linked-list">{abilities.length ? abilities.map(item => <span key={item.id}>{item.name}<small>{item.source}</small></span>) : <em>尚未选择</em>}</div></section>
      <section className="preview-section"><h3>可用招式</h3><div className="move-list">{moves.length ? moves.slice(0,4).map(item => <span key={item.id}>{item.name}</span>) : <em>尚未选择</em>}</div></section>
      <button className="button primary wide" onClick={onNext}>下一步：预览图鉴 <span>→</span></button>
    </aside>
  )
}
