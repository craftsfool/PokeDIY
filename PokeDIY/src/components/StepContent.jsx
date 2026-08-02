import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, FileImage, Link2, Plus, Search, Sparkles, X } from 'lucide-react'
import { library, types } from '../data/library'

function Field({ label, hint, children }) {
  return <label className="field"><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>
}

function StepHeader({ number, title, copy }) {
  return <div className="step-header"><small>STEP {String(number).padStart(2, '0')}</small><h1>{title}</h1><p>{copy}</p></div>
}

export function StepContent({ step, draft, setDraft, dexEntries, onNext, onPublish }) {
  const fileRef = useRef(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('全部')
  const [tab, setTab] = useState('引用原版')
  const [custom, setCustom] = useState({ kind: '特性', name: '', description: '' })
  const allItems = [...library, ...draft.custom]
  const filtered = useMemo(() => allItems.filter(item => (filter === '全部' || item.kind === filter) && `${item.name}${item.description}`.includes(query)), [allItems, filter, query])

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }))
  const handleImage = event => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update('image', reader.result)
    reader.readAsDataURL(file)
  }
  const toggleType = type => update('types', draft.types.includes(type) ? draft.types.filter(t => t !== type) : draft.types.length < 2 ? [...draft.types, type] : [draft.types[1], type])
  const toggleItem = id => update('selected', draft.selected.includes(id) ? draft.selected.filter(item => item !== id) : [...draft.selected, id])
  const addCustom = () => {
    if (!custom.name.trim() || !custom.description.trim()) return
    const item = { ...custom, id: `custom-${Date.now()}`, name: custom.name.trim(), description: custom.description.trim(), source: '自建' }
    setDraft(current => ({ ...current, custom: [...current.custom, item], selected: [...current.selected, item.id] }))
    setCustom({ kind: '特性', name: '', description: '' })
    setTab('引用原版')
  }

  if (step === 1) return <div className="work-surface"><StepHeader number={1} title="形象设定" copy="上传你的原创设定图。图片只保存在当前浏览器草稿中。"/><div className={draft.image ? 'upload-zone has-image' : 'upload-zone'} onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage}/>{draft.image ? <><img src={draft.image} alt="已上传的原创形象"/><button className="replace-image">更换图片</button></> : <><span className="upload-icon"><FileImage size={28}/></span><h2>拖放或选择形象设定图</h2><p>支持 PNG、JPG、WebP，建议使用透明或纯色背景</p><button className="button primary">选择图片</button></>}</div><div className="notice"><Sparkles size={17}/><p><strong>请上传你有权使用的原创内容</strong><br/>不要直接上传官方立绘或他人的作品；发布时可填写画师署名和授权说明。</p></div><div className="form-actions"><span/><button className="button primary" onClick={onNext}>下一步：基础资料 →</button></div></div>

  if (step === 2) return <div className="work-surface"><StepHeader number={2} title="基础资料" copy="像编写百科词条一样，定义它最核心的身份与生态。"/><div className="form-grid"><Field label="中文名" hint="必填"><input value={draft.name} onChange={e => update('name', e.target.value)} placeholder="例如：芽绒兽"/></Field><Field label="分类"><input value={draft.category} onChange={e => update('category', e.target.value)} placeholder="例如：棉芽宝可梦"/></Field><Field label="身高（m）"><input type="number" min="0" step="0.1" value={draft.height} onChange={e => update('height', e.target.value)}/></Field><Field label="体重（kg）"><input type="number" min="0" step="0.1" value={draft.weight} onChange={e => update('weight', e.target.value)}/></Field></div><div className="field block"><span>属性<small>最多选择两个</small></span><div className="type-picker">{types.map(type => <button key={type} className={draft.types.includes(type) ? 'selected' : ''} onClick={() => toggleType(type)}>{type}</button>)}</div></div><Field label="图鉴说明"><textarea rows="5" value={draft.description} onChange={e => update('description', e.target.value)} maxLength="180"/><small className="counter">{draft.description.length}/180</small></Field><div className="form-actions"><span>资料会同步更新到右侧预览</span><button className="button primary" onClick={onNext}>下一步：进化关系 →</button></div></div>

  if (step === 3) return <div className="work-surface"><StepHeader number={3} title="进化关系" copy="关联现有宝可梦，或让它从一条全新的进化链开始。"/><div className="evolution-choice"><button className={draft.evolutionBase ? 'choice selected' : 'choice'} onClick={() => !draft.evolutionBase && update('evolutionBase', dexEntries[0]?.slug || 'bulbasaur')}><Link2/><strong>关联原版进化链</strong><span>从已有数据库选择一个物种作为前置或分支。</span></button><button className={!draft.evolutionBase ? 'choice selected' : 'choice'} onClick={() => update('evolutionBase', '')}><Plus/><strong>新建进化链</strong><span>让这只原创宝可梦成为独立的进化起点。</span></button></div>{draft.evolutionBase && <Field label="关联物种"><div className="select-wrap"><select value={draft.evolutionBase} onChange={e => update('evolutionBase', e.target.value)}>{dexEntries.map(entry => <option key={entry.slug} value={entry.slug}>{String(entry.nationalDex).padStart(4,'0')} · {entry.names['zh-Hans']}{entry.formLabel ? `（${entry.formLabel}）` : ''}</option>)}</select><ChevronDown size={16}/></div></Field>}<Field label="进化方式"><input value={draft.evolutionMethod} onChange={e => update('evolutionMethod', e.target.value)} placeholder="例如：亲密度提升后，在白天升级"/></Field><div className="chain-preview"><span className="chain-node official">{draft.evolutionBase ? dexEntries.find(item => item.slug === draft.evolutionBase)?.names['zh-Hans'] : '原创起点'}</span><i>→<small>{draft.evolutionMethod || '未设置条件'}</small></i><span className="chain-node custom">{draft.name || '未命名'}</span></div><div className="form-actions"><span>当前加载 {dexEntries.length} 条全国图鉴数据（含地区形态）</span><button className="button primary" onClick={onNext}>下一步：特性与招式 →</button></div></div>

  if (step === 4) return <div className="work-surface"><StepHeader number={4} title="特性与招式" copy="引用原版资料，或为你的宝可梦创造全新能力。"/><div className="tabs"><button className={tab === '引用原版' ? 'active' : ''} onClick={() => setTab('引用原版')}>引用原版</button><button className={tab === '新建内容' ? 'active' : ''} onClick={() => setTab('新建内容')}>新建内容</button></div>{tab === '引用原版' ? <><div className="library-tools"><label><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索特性或招式"/>{query && <button onClick={() => setQuery('')} aria-label="清空搜索"><X size={15}/></button>}</label><div className="segmented">{['全部','特性','招式'].map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="library-list">{filtered.map(item => {const selected = draft.selected.includes(item.id); return <button key={item.id} className={selected ? 'library-row selected' : 'library-row'} onClick={() => toggleItem(item.id)}><span className="check">{selected && <Check size={14}/>}</span><span className="kind">{item.kind}</span><span className="item-main"><strong>{item.name}</strong><small>{item.description}</small></span><span className={item.source === '原版' ? 'source official' : 'source'}>{item.source}</span></button>})}{!filtered.length && <div className="empty">没有找到匹配内容，你可以切换到“新建内容”。</div>}</div></> : <div className="custom-form"><div className="notice"><Plus size={17}/><p><strong>新建原创资料</strong><br/>发布后，它会显示“自建”标识，与引用的原版资料区分。</p></div><Field label="内容类型"><div className="segmented inline">{['特性','招式'].map(item => <button key={item} className={custom.kind === item ? 'active' : ''} onClick={() => setCustom(c => ({...c, kind:item}))}>{item}</button>)}</div></Field><Field label="名称"><input value={custom.name} onChange={e => setCustom(c => ({...c, name:e.target.value}))} placeholder={custom.kind === '特性' ? '例如：棉絮护甲' : '例如：新芽回响'}/></Field><Field label="效果说明"><textarea rows="5" value={custom.description} onChange={e => setCustom(c => ({...c, description:e.target.value}))} placeholder="用明确、可验证的方式描述触发条件与效果。"/></Field><button className="button primary" onClick={addCustom}>添加到当前设定</button></div>}<div className="form-actions"><span>已选择 {draft.selected.length} 项资料</span><button className="button primary" onClick={onNext}>下一步：预览图鉴 →</button></div></div>

  return <div className="work-surface final-step"><StepHeader number={5} title="图鉴预览" copy="检查资料来源与原创设定，确认无误后生成你的百科词条。"/><div className="review-table"><div><span>形象设定</span><strong>{draft.image ? '已上传' : '尚未上传（可继续发布草稿）'}</strong></div><div><span>基础资料</span><strong>{draft.name} · {draft.types.join(' / ')}</strong></div><div><span>进化关系</span><strong>{draft.evolutionBase ? '已关联原版物种' : '原创独立进化链'}</strong></div><div><span>特性与招式</span><strong>{draft.selected.length} 项（含 {draft.custom.length} 项自建）</strong></div><div><span>发布协议</span><strong>CC BY-NC-SA 3.0</strong></div></div><label className="agreement"><input type="checkbox" defaultChecked/><span>我确认拥有原创内容的发布权，并同意以 CC BY-NC-SA 3.0 协议共享本词条。</span></label><button className="button primary publish" onClick={onPublish}>生成百科词条</button><p className="publish-note">当前原型仅生成本地预览，不会向外部服务器提交内容。</p></div>
}
