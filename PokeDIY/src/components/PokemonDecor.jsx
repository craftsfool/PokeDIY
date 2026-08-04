const typeOrder = ['一般','格斗','飞行','毒','地面','岩石','虫','幽灵','钢','火','水','草','电','超能力','冰','龙','恶','妖精']

export const typePalette = {
  一般: { badge:'#9fa19f', main:'#bbbbaa', light:'#e7e7d8', dark:'#8a8a7b' },
  火: { badge:'#e62829', main:'#ff4422', light:'#ff927d', dark:'#ba1f00' },
  水: { badge:'#2980ef', main:'#3399ff', light:'#77bbff', dark:'#0d6ac8' },
  电: { badge:'#fac000', main:'#ffcc33', light:'#fae078', dark:'#bd8e00' },
  草: { badge:'#3fa129', main:'#77cc55', light:'#bdffa3', dark:'#40c60a' },
  冰: { badge:'#3fd8ff', main:'#77ddff', light:'#dbf6ff', dark:'#13a8d9' },
  格斗: { badge:'#ff8000', main:'#bb5544', light:'#dd9988', dark:'#912e1e' },
  毒: { badge:'#9141cb', main:'#aa5599', light:'#c689ba', dark:'#792f6a' },
  地面: { badge:'#915121', main:'#ddbb55', light:'#f1dda0', dark:'#b59226' },
  飞行: { badge:'#81b9ef', main:'#6699ff', light:'#99bbff', dark:'#3678ff' },
  超能力: { badge:'#ef4179', main:'#ff5599', light:'#ff9cc4', dark:'#d00053' },
  虫: { badge:'#91a119', main:'#aabb22', light:'#daec44', dark:'#849400' },
  岩石: { badge:'#afa981', main:'#bbaa66', light:'#e1d08c', dark:'#88762c' },
  幽灵: { badge:'#704170', main:'#6666bb', light:'#9f9fec', dark:'#42428e' },
  龙: { badge:'#5060e1', main:'#7766ee', light:'#a194ff', dark:'#31229d' },
  恶: { badge:'#50413f', main:'#775544', light:'#bda396', dark:'#442c21' },
  钢: { badge:'#60a1b8', main:'#aaaabb', light:'#dfdfe1', dark:'#74747b' },
  妖精: { badge:'#ef70ef', main:'#ffaaff', light:'#fbcbfb', dark:'#ec67ea' },
}

export const statPalette = {
  HP: { fill:'#8ac654', light:'#97c87a', dark:'#558936' },
  攻击: { fill:'#f8cb3c', light:'#fae192', dark:'#ccbc33' },
  防御: { fill:'#d98837', light:'#fbb977', dark:'#b4673d' },
  特攻: { fill:'#59c3d0', light:'#a2d4da', dark:'#1a7e8d' },
  特防: { fill:'#5890cd', light:'#89a9cd', dark:'#004689' },
  速度: { fill:'#a456d0', light:'#c39cd8', dark:'#3c2957' },
}

export const categoryPalette = {
  物理: { fill:'#ff4400', light:'#ee7700', dark:'#cc2200' },
  特殊: { fill:'#2266cc', light:'#7799dd', dark:'#0033aa' },
  变化: { fill:'#777', light:'#acacac', dark:'#665' },
  极巨: { fill:'#d83b77', light:'#ee82a9', dark:'#9b1e51' },
  超极巨: { fill:'#8b3fc1', light:'#b77cde', dark:'#60258a' },
}

const categoryAssets = {
  物理: '/assets/move-physical.png',
  特殊: '/assets/move-special.png',
  变化: '/assets/move-status.png',
}

export function getTypePalette(type) {
  return typePalette[type] || { badge:'#9fa19f', main:'#a2a9b1', light:'#eaecf0', dark:'#72777d' }
}

export function TypeIcon({ type, size = 20 }) {
  const index = Math.max(0, typeOrder.indexOf(type))
  return <span className="poke-type-icon" aria-hidden="true" style={{
    '--icon-size': `${size}px`,
    '--icon-sheet-height': `${size * 21}px`,
    '--icon-position': `${-index * size}px`,
  }}/>
}

export function TypeBadge({ type, compact = false }) {
  const palette = getTypePalette(type)
  return <span className={compact ? 'poke-type-badge compact' : 'poke-type-badge'} style={{'--badge-color':palette.badge}}><TypeIcon type={type}/><span>{type}</span></span>
}

export function MoveCategoryBadge({ category, compact = false }) {
  const normalizedCategory = categoryPalette[category] ? category : '变化'
  const palette = categoryPalette[normalizedCategory]
  const asset = categoryAssets[normalizedCategory]
  return <span className={compact ? 'move-category-badge compact' : 'move-category-badge'} style={{'--category-fill':palette.fill,'--category-dark':palette.dark}}>{asset && <img src={asset} alt=""/>}<span>{normalizedCategory}</span></span>
}

export function getMoveMeta(item) {
  if (item.kind !== '招式') return null
  if (item.type || item.category) return { type:item.type || '一般', category:item.category || '变化' }
  const [type,category] = String(item.description || '').split(' · ')
  return { type:typePalette[type] ? type : '一般', category:categoryPalette[category] ? category : '变化' }
}

export function StatMeter({ name, value }) {
  const palette = statPalette[name] || statPalette.HP
  return <div className="poke-stat-meter" style={{'--stat-fill':palette.fill,'--stat-light':palette.light,'--stat-dark':palette.dark}}>
    <span>{name}</span><i><b style={{width:`${Math.min(Number(value) / 2.55,100)}%`}}/></i><em>{value}</em>
  </div>
}
