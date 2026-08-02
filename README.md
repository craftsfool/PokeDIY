# PokeDIY

PokeDIY 是面向原创宝可梦设定的 Wiki 页面生成器。玩家可以上传原创形象、填写图鉴资料与种族值、关联原版宝可梦的进化链或特殊形态，并引用或新建特性与招式。最终阅读页参照神奇宝贝百科的条目结构，省略动画、漫画等与自制设定无关的栏目。

在线页面由 Vercel 部署；前端项目位于 `PokeDIY/`。

## 本地运行

```sh
cd PokeDIY
npm ci
npm run dev
```

生产构建：

```sh
cd PokeDIY
npm run build
```

页面结构及引用资料来源于 [神奇宝贝百科](https://wiki.52poke.com/)。相关内容遵循 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans)，转载、修改和后续发布时须保留署名、非商业使用并以相同协议共享。

## Pokémon 图鉴预存数据

## 全国图鉴

- `data/national/national-pokedex.json`：从 52Poké Wiki 全国图鉴列表生成的结构化数据，含 1025 个主条目与地区形态。
- `data/national/national-pokedex.zh-CN.md`：供人工核对的中、日、英文名称与属性列表。
- `scripts/generate-national-pokedex.mjs`：通过 52Poké MediaWiki API 重新生成全国图鉴。

来源内容依照 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans) 使用，并在生成文件中保留来源页面、修订版本及署名信息。

运行：

```sh
node scripts/generate-national-pokedex.mjs
```

## 进化方式与地区／特殊形态

- `data/reference/evolution-methods.json`：从 52Poké 的 `Template:进化框/Evo` 当前源码生成，收录 19 类结构化进化方式及其可编辑字段。
- `data/national/pokemon-forms.json`：从 Pokémon HOME 形态列表生成，收录 497 个地区与特殊形态，包括超级进化、超极巨化和原始回归。
- `scripts/generate-evolution-reference.mjs`：重新校验进化模板并生成方式选项。
- `scripts/generate-pokemon-forms.mjs`：重新爬取并生成形态数据。

运行：

```sh
node scripts/generate-evolution-reference.mjs
node scripts/generate-pokemon-forms.mjs
```

## 原版特性与招式

- `data/reference/original-content.json`：供网站读取的完整原版特性与招式数据。
- `data/reference/abilities.zh-CN.md`：特性编号、中日英名称、说明与世代核对表。
- `data/reference/moves.zh-CN.md`：招式编号、中日英名称、属性、分类、威力、命中、PP 与世代核对表。
- `scripts/generate-original-reference.mjs`：通过 52Poké MediaWiki API 重新生成数据。

运行：

```sh
node scripts/generate-original-reference.mjs
```

## Pokémon Legends: Z-A

当前数据集收录主游戏密阿雷图鉴：

- `data/legends-za/lumiose-pokedex.json`：供程序直接读取的结构化数据。
- `data/legends-za/lumiose-pokedex.zh-CN.md`：供人工核对的中文列表。
- `data/legends-za/trainers/`：按训练家分开的预存记录。
- `scripts/generate-lumiose-pokedex.mjs`：通过 HTTP 数据源重新生成列表，不依赖浏览器操作。
- `scripts/generate-trainer-preset.mjs`：从密阿雷图鉴生成指定训练家的前 N 条登记记录。
- `data/legends-za/final-evolution-builds.json`：115 个最终物种的原色/闪光双配装，共 230 条。
- `data/legends-za/final-evolution-builds.zh-CN.md`：性别、定位、性格、努力值、道具和四招的中文核对表。
- `scripts/generate-za-final-builds.mjs`：从 Z-A 招式、道具及种族值数据重新生成并校验双配装。
- `scripts/za-final-builds-address-bar.txt`：在宝可梦小助手 Z-A 页面执行的一行地址栏脚本。

首版不包含 DLC“超次元爆涌”的超次元图鉴，也不展开花纹、地区形态、大小等同图鉴编号的形态差异。

运行：

```sh
node scripts/generate-lumiose-pokedex.mjs
node scripts/generate-trainer-preset.mjs 完颜亮 640840 115
node scripts/generate-za-final-builds.mjs
```
