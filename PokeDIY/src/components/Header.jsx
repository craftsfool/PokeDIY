import { BookOpen, Save } from 'lucide-react'

export function Header({ onSave, saved }) {
  return (
    <>
      <div className="utility-bar">
        <span>52Poké 社区创作计划</span>
        <span>非商业 · 署名 · 相同方式共享</span>
      </div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="宝可梦DIY首页">
          <span className="brand-mark"><span /></span>
          <span><strong>宝可梦DIY</strong><small>POKÉMON FAN DEX</small></span>
        </a>
        <nav aria-label="主导航">
          <a className="active" href="#workbench">创作工坊</a>
          <a href="#preview">我的图鉴</a>
          <a href="https://wiki.52poke.com/wiki/Special:%E9%9A%8F%E6%9C%BA%E9%A1%B5%E9%9D%A2" target="_blank" rel="noreferrer">社区灵感</a>
          <a href="https://wiki.52poke.com/wiki/Category:%E7%A5%9E%E5%A5%87%E5%AE%9D%E8%B4%9D%E7%99%BE%E7%A7%91%E8%A7%84%E8%8C%83" target="_blank" rel="noreferrer">创作规范</a>
        </nav>
        <div className="header-actions">
          <span className={saved ? 'save-state saved' : 'save-state'}><BookOpen size={14} />{saved ? '草稿已保存' : '正在编辑'}</span>
          <button className="button secondary" onClick={onSave}><Save size={16} />保存草稿</button>
        </div>
      </header>
    </>
  )
}
