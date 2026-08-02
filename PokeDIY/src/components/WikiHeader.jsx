import { Menu, Search } from 'lucide-react'

export function WikiHeader() {
  return (
    <header className="mw-header">
      <button className="mw-menu" aria-label="打开主菜单"><Menu size={24}/></button>
      <a className="mw-brand" href="https://wiki.52poke.com/" target="_blank" rel="noreferrer" aria-label="神奇宝贝百科">
        <img
          className="mw-source-logo"
          src="/assets/wiki-logo.svg"
          alt=""
        />
        <img
          className="mw-source-wordmark"
          src="/assets/wiki-wordmark-sc.png"
          alt="神奇宝贝百科"
        />
      </a>
      <form className="mw-search" action="https://wiki.52poke.com/index.php" method="get" target="_blank">
        <Search size={18}/><input name="search" aria-label="搜索神奇宝贝百科内容" placeholder="搜索神奇宝贝百科内容"/><button type="submit">搜索</button>
      </form>
      <a
        className="mw-mobile-search"
        href="https://wiki.52poke.com/wiki/Special:%E6%90%9C%E7%B4%A2"
        target="_blank"
        rel="noreferrer"
        aria-label="搜索神奇宝贝百科"
      >
        <Search size={22}/>
      </a>
      <nav className="mw-account"><a href="https://wiki.52poke.com/wiki/Special:%E5%88%9B%E5%BB%BA%E8%B4%A6%E6%88%B7" target="_blank" rel="noreferrer">创建账号</a><a href="https://wiki.52poke.com/wiki/Special:%E7%94%A8%E6%88%B7%E7%99%BB%E5%BD%95" target="_blank" rel="noreferrer">登录</a></nav>
    </header>
  )
}
