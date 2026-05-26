# 时镜 ShiJing · Design System

> **当前版本**：v1.2
> **状态**：Active Working Baseline
> **修订日期**：2026-05-26
> **作用范围**：产品端所有用户可见界面（不适用于契约层、调试面板、技术详情折叠区）

---

## 维护说明（先读这一段）

这是时镜 Design System 的**当前执行基准**。它约束用户可见 UI、交互状态、产品体验结构和 `@nimiplatform/kit` 的使用方式；它不是 kernel 契约，也不替代 `SJG-*` 产品边界。

本文件允许被产品审计结果直接修正。若某条视觉规则带来的收益低于重构成本，优先调整规则，而不是为了规则推翻稳定的 kit 能力。

**修订流程**：
1. 直接编辑本文件。
2. 任何修订都更新顶部「当前版本」「修订日期」字段；语义变更升 minor（v1.2 → v1.3），破坏性变更升 major（v1.x → v2.0）。
3. 在文末「修订日志」追加一行说明：改了什么、为什么改、影响哪些组件。
4. 与本文件冲突的 v1.0 / 早期讨论作废；如需追溯历史，查 git log。

**与其他规范的关系**：
- `kernel/*` 是技术契约（`SJG-*`），不动；本文件不引入新的 `SJG-*` ID。
- `kernel/ia-contract.md` 决定 IA（四 Tab 结构），本文件决定 IA 的**视觉呈现**。
- `kernel/product-contract.md` 决定产品边界，本文件在边界内做视觉表达。
- `@nimiplatform/kit` 是实现基座。默认复用 kit 的组件、可访问性、交互原语和主题能力；只有当 kit 原语阻碍 ShiJing 的核心产品体验时，才局部封装或替换。
- 文档冲突时，**契约优先于设计**（设计可被契约约束推翻，反之不行）。

**落地位置**：
- ShiJing 特有颜色 / 间距 / 阴影 / 字号通过 `--shijing-*` semantic CSS variable 在 [src/styles.css](../../../src/styles.css) 中声明；这些 token 可以映射到 `--nimi-*`，不要求一次性替换 kit token。
- 组件实现位于 [src/product/](../../../src/product/) 下。业务组件不写死 hex；少量 px 只能出现在 token 定义或 kit 兼容封装层。

---

## 0. 设计原则

> **"像一本好的笔记本，不像一个法器。"**

时镜是用户长期相伴的工具，不是被取悦的玄学服务。它的视觉应让人感到：**安静、可信、留白、想继续读下去**。

**工程纪律：**
- 产品体验优先于视觉洁癖。先解决首次使用、生成前置条件、Reading 可信呈现、View 闭环和失败恢复，再讨论低收益视觉替换。
- 调用 `@nimiplatform/kit` 组件时优先用 kit props / className / wrapper 约束；不 fork kit，不全量重做 kit，不修改 kit 自己的 `--nimi-*` token。
- 新代码不做 MVP 式含糊简化。复杂输入、失败原因、证据快照、可生成范围必须精确表达，不能用空卡片和泛说明代替。

---

## 1. 设计关键词

### 1.1 五个核心气质

| 关键词 | 一句话描述 | 设计表达 |
|---|---|---|
| **青** | 玉之色、木之德，生发而非内敛 | 主品牌色采用玉青 #2F5F57；标题用宋；不使用纯黑边线 |
| **纸** | 像翻一本印刷讲究的书 | 阅读主体偏纸感；chrome / overlay 可保留轻 glass，但不能压过内容 |
| **留白** | 信息密度受控，阅读优先 | 内容区固定阅读宽度；模块间用 48px 节奏；不堆 chip |
| **节制** | 不解释、不弹跳、不奖励 | 不用 emoji、彩色渐变、confetti、glow；动效不超过 250ms |
| **陪伴** | 不严厉、不冷淡、不夸赞 | 文案与按钮用平视语气；状态色饱和度全部降一档；不"恭喜！"也不"警告⚠️" |

### 1.2 五行依据（为什么是玉青）

时镜的产品定位是"**判断节奏 + 辅助选择**"，对应五行里的 **木**（生发、向上、流动）。
木之色为 **青**（涵盖青到绿），玉是青的高级载体——所以主色不是"哪种深蓝好看"的审美选择，而是**有文本依据的产品决策**。

辅助意象保留"墨"（用于宋体标题的气质），但**色彩主轴是青而非墨**。

### 1.3 三条姿态准则

- **比克制再克制一点**：每加一个颜色 / 阴影 / 图标，先问"不加它损失什么"。
- **东方靠骨不靠皮**：用宋体节奏 + 留白 + 文字层级表达东方感，**不靠水墨贴图、八卦符号、印章纹饰**。
- **慢于直觉**：动效、loading、toast 都比"现代 SaaS 默认值"再慢 30%。

### 1.4 kit-first 姿态

ShiJing 不做独立设计系统重建。`@nimiplatform/kit` 是默认 UI 基座，保留它的：

- `Surface` / `OverlayShell` / `Popover` / `NimiTabs` / `Avatar` 等基础组件；
- 既有 focus、keyboard、aria、overlay、menu 行为；
- 轻 glass / mesh 带来的 Nimi 家族一致性，只要它不伤害阅读性和信息层级。

允许局部封装 kit 的条件只有四类：

1. kit 默认样式让核心内容不可读、不可扫描或不可判断状态；
2. kit 组件无法表达 ShiJing 的领域状态，例如 Reading 证据、出生证据完整度、View 生成能力；
3. kit 默认交互无法满足移动端触控、键盘或无障碍要求；
4. 同一问题在两个以上页面重复出现，封装能降低长期复杂度。

除此之外，不因审美偏好推翻 kit。

---

## 2. 色彩系统

### 2.1 哲学

三层色板：**纸（背景） · 青（品牌与文字） · 节气色（功能状态）**。
**强调色仅一个**——玉青。功能状态色全部低饱和、明度一档，避免色彩噪声。

实现上采用 **semantic overlay**：ShiJing 先定义产品语义 token，再映射到 kit token 或覆写局部 class。目标是控制产品气质，不是消灭 `--nimi-*`。

Glass / mesh 不再作为绝对反面。允许出现在 app chrome、popover、modal、侧边 overlay、轻背景层；Reading 正文、表单主体、列表主体必须优先保证纸面可读性。

### 2.2 Light Theme

#### 纸 · Surface（背景层）

| Token | HEX | 用途 |
|---|---|---|
| `surface/canvas` | `#F6F4EE` | 页面背景（暖宣纸感，不发黄） |
| `surface/canvas-subtle` | `#F1EEE6` | 二级背景、section 间隔条 |
| `surface/card` | `#FFFFFF` | 主内容卡片 |
| `surface/card-quiet` | `#FBFAF6` | 次级卡片、HeroCard 内层 |
| `surface/overlay` | `#FFFFFF` | popover、toast、modal 内容容器 |
| `surface/scrim` | `rgba(31, 37, 32, 0.32)` | modal 蒙层 |

#### 青 · Text（文字层，微暖以贴合品牌色温）

| Token | HEX | 用途 |
|---|---|---|
| `text/primary` | `#1F2520` | 一级文字（极轻绿调，不用纯黑） |
| `text/secondary` | `#5C615A` | 二级文字、正文段落副本 |
| `text/muted` | `#8C9088` | 元信息、时间戳、help text |
| `text/disabled` | `#B8BCB4` | 禁用态 |
| `text/on-brand` | `#FFFFFF` | 品牌色背景上的文字 |
| `text/on-brand-quiet` | `rgba(255,255,255,0.78)` | 品牌色背景上的副文字 |

#### 品牌

| Token | HEX | 用途 |
|---|---|---|
| `brand/primary` | `#2F5F57` | **深玉青** —— 主品牌色，唯一强调色 |
| `brand/primary-hover` | `#274F49` | primary 按钮 hover |
| `brand/primary-active` | `#1F403B` | primary 按钮 active |
| `brand/primary-soft` | `rgba(47, 95, 87, 0.10)` | selected 行底、品牌 chip 软底 |
| `brand/primary-soft-hover` | `rgba(47, 95, 87, 0.14)` | hover 加深 |

> ⚠️ 玉青是**唯一**品牌强调色。同屏最多两处使用强调色（主 CTA + selected 指示），其余降为 secondary / ghost。强调色用尽即视觉污染。

#### 边框 · Border

| Token | HEX | 用途 |
|---|---|---|
| `border/subtle` | `#EFEBE3` | section divider、list divider |
| `border/default` | `#DDD9CF` | 卡片、输入框默认边框 |
| `border/strong` | `#BFBAAF` | hover 态边框 |
| `border/brand` | `#2F5F57` | selected / focused 边框 |
| `border/danger` | `#A85447` | 危险态边框 |

#### 功能状态色

全部经低饱和处理，明度一档，避免视觉级别混乱。

| Token | HEX | 软底 | 用途 |
|---|---|---|---|
| `status/success` | `#5F7A4E` 深苔青 | `rgba(95, 122, 78, 0.10)` | 保存成功、操作完成 |
| `status/warning` | `#B5854A` 古铜 | `rgba(181, 133, 74, 0.12)` | 过期提示、需注意 |
| `status/danger` | `#A85447` 朱砂砖 | `rgba(168, 84, 71, 0.10)` | 删除、失败、错误 |
| `status/info` | `#5A7A8E` 烟青蓝 | `rgba(90, 122, 142, 0.10)` | 一般信息提示 |
| `status/thinking` | `#6E6A9E` 青紫灰 | `rgba(110, 106, 158, 0.10)` | **仅** AI 思考动态 |

> ❗ `status/thinking` 使用纪律见 §2.4。

#### 浅底色（两个角色拉开色相，避免混淆）

| Token | HEX | 用途 |
|---|---|---|
| `tint/selected` | `#E7EDE8` 玉青雾（微暖） | 选中行底、可选项激活 |
| `tint/info` | `#E5E9EE` 烟蓝灰 | 一般信息提示底（与 selected 同色相分离） |

> 这两个 token 与 `brand/primary-soft` 不同：soft 是品牌 chip 软底，tint 是大面积区块底。

#### 交互叠加 · Interaction Overlay

| Token | 值 | 用途 |
|---|---|---|
| `overlay/hover` | `rgba(31, 37, 32, 0.04)` | 任意可点击元素 hover |
| `overlay/active` | `rgba(31, 37, 32, 0.08)` | 任意可点击元素 active |
| `overlay/focus-ring` | `0 0 0 3px rgba(47, 95, 87, 0.22)` | focus ring；**禁用浏览器默认蓝 outline** |

### 2.3 对比度核算（已通过）

- `brand/primary` 在 white：~7.5:1（AAA 大字、AA 正文）✓
- `text/on-brand` 在 `brand/primary`：~7.5:1 ✓
- `brand/primary` 在 `surface/canvas`：~5.9:1（AA 正文）✓
- `text/primary` 在 `surface/canvas`：~14:1 ✓
- `text/secondary` 在 `surface/canvas`：~6.3:1 ✓
- `text/muted` 在 `surface/canvas`：~3.6:1（AA 大字、AA 元信息）✓

### 2.4 `status/thinking` 使用纪律（不可妥协）

`#6E6A9E` 是一个有**特定文化包袱**的颜色（紫色 + 命理品类联想 = 紫微 / 仙气）。我们承认它"AI 标识色"的合法身份，但必须用执行纪律把风险关在笼子里：

**允许出现的位置：**
- ✅ Reading 生成时的 thinking notice 横条左侧 3px 边
- ✅ Conversation 等待回复时的"时镜正在思考…"提示
- ✅ 与上述等价的、明确表达"AI 正在运作"的**动态状态**

**严禁出现的位置：**
- ❌ 任何静态 UI 元素（按钮、链接、chip、tab 指示器、装饰条）
- ❌ 任何品牌物料（图标、logo、应用启动页）
- ❌ Reading / 占卜结果本身的内容容器（结果已经"出来"，思考已结束）
- ❌ 收藏夹、推荐项的 chip 或角标
- ❌ 任何"AI 生成内容"的永久标识

**简言之**：这个紫灰**只在加载动画里活着**，加载结束的那一秒它就该消失。一旦它出现在静态元素上，立刻把它换成 `text/muted` 或 `status/info`。

### 2.5 Dark Theme · Token 草表（后续 hot-fix 候选，定义先行）

实施不推迟到 v2，但不能优先于核心产品闭环。

| Token | HEX |
|---|---|
| `surface/canvas` | `#15171C` 深墨 |
| `surface/canvas-subtle` | `#1A1D22` |
| `surface/card` | `#1F2228` |
| `surface/card-quiet` | `#252830` |
| `text/primary` | `#E8E6E1` 米白（不用纯白） |
| `text/secondary` | `#A8AAB2` |
| `text/muted` | `#7C7E84` |
| `border/subtle` | `#2A2D34` |
| `border/default` | `#363941` |
| `brand/primary` | `#7FA89E`（提亮的玉青，深底上不沉） |
| `brand/primary-soft` | `rgba(127, 168, 158, 0.16)` |

> ⚠️ `on-brand` 系列在暗色下需重新校准对比度，**不可**沿用 Light 值的 opacity。

---

## 3. 字体系统

### 3.1 字体栈

```
chinese-serif:  "Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", serif
chinese-sans:   "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
                "Source Han Sans SC", system-ui, sans-serif
latin-sans:     "Inter", "SF Pro Text", system-ui, -apple-system, sans-serif
mono:           "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace
```

> 中文优先 PingFang。**不引入仿宋 / 楷体**（屏幕上不锐利且廉价）。
> 标题不用思源黑体超粗——东方感**不靠重量靠衬线**。

### 3.2 字号梯度（8 档，砍掉冗余）

| Token | 字号 | 行高 | 字重 | 字体 | 字距 | 主要用途 |
|---|---|---|---|---|---|---|
| `display` | 32 | 1.3 | 600 | serif | 0 | 仅 Today 日期 hero、Reading 标题 hero |
| `h1` | 24 | 1.4 | 600 | serif | 0.01em | 页面主标题 |
| `h2` | 20 | 1.4 | 600 | serif | 0.01em | section 标题、modal 标题 |
| `h3` | 16 | 1.5 | 600 | sans | 0 | 卡片标题、表单分组 |
| `body-lg` | 16 | 1.8 | 400 | sans | 0 | **阅读容器内默认正文** |
| `body` | 14 | 1.6 | 400 | sans | 0 | 列表 / 表单 / 元信息默认 |
| `caption` | 13 | 1.5 | 400 | sans | 0 | 元信息、时间戳、help text |
| `label` | 12 | 1.4 | 500 | sans | 0.05em | 表单 label、eyebrow、tab 文字 |

> **禁止**出现 10 / 11 / 15 / 17 / 18 / 22 / 28px。每多一档字号都是设计债。

### 3.3 "默认正文"的语义切分

| 容器类型 | 默认正文 token |
|---|---|
| **阅读类容器**：ReadingCard、Today 主段、Conversation turn body、Reading 详情、Settings 描述段 | `body-lg`（16/1.8） |
| **结构类容器**：列表项、表单字段、元信息、按钮、chip、tab、help text | `body`（14/1.6）或更小 |

ReadingCard / ConversationThread / TodayTab 等组件规范中**显式声明**正文用 `body-lg`，不要再讨论。

### 3.4 用宋体的场所（建立东方气质）

| 必须用宋 | 原因 |
|---|---|
| Brand mark「時」「时镜」 | 品牌锚 |
| 所有 H1 / H2 标题 | 节奏来源 |
| Reading 主段摘要 | 阅读仪式感 |
| Today 顶部日期 + 农历 + 节气 | 文化气质（**品牌签名**，见 §11） |
| 卦象 / 节气 / 干支 / 十神 / 大运等专有名词 | 视觉锚点（inline span 包裹） |
| 引述块 / 古典原文 | 内容气质 |

### 3.5 必须用无衬线的场所

- 所有表单 label / input / select / textarea
- 所有按钮文字
- 所有列表元信息、时间戳、计数
- 所有数字（表格、统计、坐标、ID）
- 所有 tab / chip / toast
- 所有错误 / 状态文案
- 移动端 < 14px 文字

### 3.6 数字字体处理

正文数字使用 `font-variant-numeric: tabular-nums`，让计数 / 时间戳在列表中等宽对齐。

---

## 4. 间距系统

### 4.1 允许值

产品层 spacing 优先使用 `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`。kit 内部组件可保留自身 spacing；ShiJing wrapper 不为了追求数值纯度重写稳定组件。

### 4.2 语义化用法

| 场景 | 值 | 备注 |
|---|---|---|
| 页面外边距（desktop） | 32 | shell body 左右 |
| 页面外边距（mobile） | 16 | overlay / 窄屏 |
| section 之间 | 48 | 主区块纵向节奏 |
| section 内子模块 | 24 | 子卡片之间 |
| 卡片内边距 / 默认 | 24 | Card |
| 卡片内边距 / hero | 32 | HeroCard、ReadingCard |
| 卡片内边距 / 紧凑 | 16 | EntityList item（mobile 同） |
| 表单字段之间 | 16 | Field 之间 |
| label 与控件之间 | 8 | 单个 Field 内 |
| help / error 与控件之间 | 4 | Field 内 |
| list item 内边距 / desktop | 12（垂直）/ 16（水平） | EntityItem |
| list item 内边距 / mobile | 16（垂直）/ 16（水平） | 触控目标 |
| list item 之间 | 0（用 divider） | 不用 gap |
| chip 内边距 | 4 / 12 | Chip |
| 按钮内边距 sm | 4 / 12 | Button sm |
| 按钮内边距 md | 8 / 16 | Button md（默认） |
| 按钮内边距 lg | 12 / 24 | Button lg |
| inline 图标 + 文字 | 8 | 任何 icon + label 组合 |
| 模块标题与内容之间 | 16 | h3 下方 |
| 页面 H1 与首个 section | 32 | |
| modal / sheet 内容上下边距 | 32 | |

### 4.3 阅读宽度

| 场景 | max-width（desktop） | mobile |
|---|---|---|
| 阅读类（Today / Reading / 我） | **720** | 100% − 32 padding |
| 表单类（命盘 / View 编辑） | **640** | 100% − 32 padding |
| 列表 / 仪表（历史 / 视角） | **960** | 100% − 32 padding |
| 会话对话 | **720** | 100% − 32 padding |

---

## 5. 圆角系统

| Token | 值 | 用途 |
|---|---|---|
| `radius/none` | 0 | divider 类元素 |
| `radius/sm` | 4 | avatar fallback 形状、tag 内嵌 |
| `radius/md` | 8 | **Button / Input / Select / Textarea** |
| `radius/lg` | 12 | Popover / Dropdown / Tooltip |
| `radius/xl` | 16 | **Card / Section** |
| `radius/2xl` | 20 | Modal / Sheet |
| `radius/3xl` | 24 | **HeroCard / ReadingCard** |
| `radius/full` | 999 | **Chip / Pill / Avatar / Segmented item** |

> 不存在 6 / 10 / 14 / 18 / 22 中间值。
> 同一容器内最多两档圆角（外层 + 内层）。三档以上即视觉混乱。

---

## 6. 阴影系统

主体内容优先纸感；chrome / overlay 可用轻 glass。判断标准不是"有没有 blur"，而是层级是否清楚、正文是否稳定可读、是否增加维护成本。

| Token | 值 | 用途 |
|---|---|---|
| `shadow/0` | none | 默认平铺卡片 |
| `shadow/1` | `0 1px 2px rgba(15, 23, 38, 0.04), 0 1px 1px rgba(15, 23, 38, 0.03)` | 普通卡片（极轻） |
| `shadow/2` | `0 6px 16px -8px rgba(15, 23, 38, 0.10), 0 2px 4px rgba(15, 23, 38, 0.04)` | hover / 浮起 / 漂浮 |
| `shadow/3` | `0 20px 48px -16px rgba(15, 23, 38, 0.18), 0 4px 12px rgba(15, 23, 38, 0.06)` | popover / modal / toast |
| `shadow/inner-paper` | `inset 0 1px 0 rgba(255, 255, 255, 0.6)` | 仅 HeroCard 顶部高光 |

> **禁止**：`spread` 大于 0、阴影颜色饱和、双层彩色 glow、`drop-shadow()` 用在内容上。
> **共存规则**：`shadow/0–1` 可与 border 共存；`shadow/2` 及以上**不**与 border 共存。

---

## 7. 边框系统

| 场景 | 边框 |
|---|---|
| 默认（卡片、输入框） | `1px solid border/default` |
| Section 内 divider | `1px solid border/subtle` |
| hover（卡片 / 输入框） | `1px solid border/strong` |
| selected / focused | `1.5px solid border/brand` + `overlay/focus-ring` |
| danger | `1px solid border/danger` |
| Reading hero / quiet 卡片 | **无边** —— 用 `shadow/1` 表达边界 |

> Focus ring 在状态色软底上对比度可能不足；规则：**若所在容器有状态色软底，将 focus-ring 不透明度从 0.22 提到 0.32**。

---

## 8. 组件视觉规范

### 8.0 kit 集成层级

组件实现分三层，避免把视觉调整升级成系统性重写：

| 层级 | 使用方式 | 适用场景 |
|---|---|---|
| `kit-direct` | 直接使用 kit 组件 + props | Header、Popover、Avatar、Tabs、基础 Surface |
| `shijing-wrapper` | 封装 kit 组件并绑定 ShiJing token / copy / 状态 | Button、Notice、EntityList、Overlay、Field |
| `domain-component` | 由 ShiJing 自建领域组件，内部可继续用 kit 原语 | ReadingCard、NatalEvidencePanel、ViewWorkspace、ConsultationComposer |

默认从 `kit-direct` 开始。只有出现领域表达不足、重复样式债或交互缺口时，才升级到 `shijing-wrapper` 或 `domain-component`。

### 8.1 Button

| Variant | 背景 | 文字 | 边框 | 阴影 |
|---|---|---|---|---|
| `primary` | `brand/primary` | `text/on-brand` | none | 0 → hover: shadow/1 |
| `secondary` | transparent | `text/primary` | `1px border/default` | 永远 0 |
| `ghost` | transparent | `text/secondary` | none | 永远 0；hover: `overlay/hover` |
| `danger` | transparent | `status/danger` | `1px border/danger` | 永远 0；hover: bg `status/danger-soft` |
| `link` | transparent | `brand/primary` | none，hover 时下划线 | none |

| Size | height（desktop） | height（mobile） | padding | font |
|---|---|---|---|---|
| `sm` | 32 | **仅 desktop 使用** | 4 / 12 | label (12/500) |
| `md` | 40 | 44 | 8 / 16 | body (14/500) |
| `lg` | 48 | 48 | 12 / 24 | h3 (16/500) |

- 圆角 8
- 文字 `letter-spacing: 0.02em`
- 主要 CTA 不带图标；图标按钮单独一档 `icon-only`，正方形
- **禁止**：彩色阴影、外发光、渐变背景、translateY(>2px) hover、bounce 过渡

### 8.2 Input / Select / Textarea

- height 40（textarea: min 96）
- 圆角 8
- 背景 `surface/card`
- 边框 `1px border/default`
- padding 8 / 12
- placeholder `text/muted`
- focus: `border/brand` + `overlay/focus-ring`
- error: `border/danger` + 下方 error help
- disabled: 背景 `surface/canvas-subtle` + `text/disabled`
- 字体：sans，size 14（mobile 默认 16，避免 iOS 自动缩放）

> **禁止**：内嵌渐变高光、圆形输入框、底部下划线 input（Material 风）、占位符渐隐动画。

### 8.3 Field

```
LABEL (12/500/0.05em, text/secondary)
                     ← gap 8
┌──────────────────────────────┐
│ Input                        │
└──────────────────────────────┘
help text (13/400, text/muted) ← gap 4
error text (13/500, status/danger) ← gap 4，与 help 互斥
```

必填星号 `*` 紧贴 label 末尾，颜色 `status/danger`。

### 8.4 Card

- bg `surface/card`
- border `1px border/default` **或** `shadow/1`（二选一，不并存）
- radius 16
- padding 24
- 标题用 H3（sans），与卡片 padding 顶部对齐
- 卡片内最多嵌套一层子卡片，子卡片 radius 12 + bg `surface/card-quiet`
- 允许使用 kit `Surface material="glass-thin"` 作为 chrome / overlay / secondary panel；不允许把主要阅读正文、长表单主体和列表行全部做成 glass。

### 8.5 HeroCard

- bg 优先 `surface/card-quiet`；Today 顶部或 shell 背景可使用 kit mesh / light glass，但必须保证正文对比度和稳定阅读宽度。
- radius 24
- padding 32（desktop）/ 24（mobile）
- shadow/2 + 可选 `shadow/inner-paper`
- **纹理使用纪律**：仅 Today Tab 的"今日"hero 一处允许加 ≤ 3% opacity 的 SVG 细颗粒噪点。Reading hero / 其他 hero **不加纹理**。
- 标题用 `display` 或 `h1` + serif
- 不在 HeroCard 内再放有边框的卡片
- 不为了去除 kit hero/chrome 的 glass 效果重做整个 shell；优先通过 token、opacity、边框和内容层级修正。

### 8.6 Section

```
EYEBROW (label, text/muted)           ← optional
Section Title (H2 / serif)
段落副本（caption / muted）           ← optional
─────────────────────────────── gap 16
content
```

- eyebrow 与 title 之间 4
- title 与 content 之间 16
- section 之间 48

### 8.7 PageHeader

```
EYEBROW (label, text/muted, optional)
Page H1 (24/600/serif)
                                [actions]
```

- 观察对象切换器在 H1 同行右侧
- H1 下方 32 后接首个 section

### 8.8 EntityList

```
H3 名称                       [新增 X]
─────────────────────────────── border/subtle 1px
Item title              meta
                              [更多]
───────────────────────────────
Item title              meta
```

- 标题行 padding 0 + 底边 border/subtle
- item padding 12/16（desktop）/ 16/16（mobile）
- item 之间用 1px border/subtle，**不用 gap**
- 整列表外部不必再加 Card
- hover 整行 `overlay/hover`
- 删除按钮一律 ghost + danger 文字，**不**做成红色填充按钮

### 8.9 EmptyState

```
        （optional 单色 line icon, 32px, text/muted）

        主标题 H3 sans

        1-2 行说明 body, text/muted

           [主要 CTA · md]
```

- 居中纵向
- 最多 1 个 CTA
- **不要** emoji / 插画 / 小人物 / 鸡汤

### 8.10 Notice / Banner / Toast

通用规则：**左边 3px 状态色 + 浅状态背景 + 内部正文**。

| 类型 | bg | left-border | 文字 |
|---|---|---|---|
| info | `status/info-soft` | `status/info` | `text/primary` |
| success | `status/success-soft` | `status/success` | `text/primary` |
| warning | `status/warning-soft` | `status/warning` | `text/primary` |
| danger | `status/danger-soft` | `status/danger` | `text/primary` |
| thinking | `status/thinking-soft` | `status/thinking` | `text/secondary` |

- padding 12 / 16
- radius 12
- 标题（如有）weight 600，正文 weight 400
- **Banner**：跨内容宽度，无 shadow
- **Toast**：右下角浮起，shadow/3，宽 320–400，4s 自动消失
- 关闭按钮：ghost icon-only，sm
- **禁止**：彩色填充背景、icon 加圆形底色、emoji 替代 icon

### 8.11 ConfirmDialog

```
┌──────────────────────────────┐
│ 标题 H2 serif                │
│                              │
│ 主消息 body                  │
│                              │
│ ┌──────────────────────────┐ │
│ │ 影响摘要（浅底强调）：    │ │
│ │ · 将影响 3 个关系         │ │
│ │ · 将影响 5 条会话         │ │
│ └──────────────────────────┘ │
│                              │
│              [取消]  [确认]  │
└──────────────────────────────┘
```

- 宽 420，radius 20，shadow/3，padding 32
- 标题与消息之间 16
- 删除场景"确认"用 danger variant；其他用 primary
- 影响摘要：`surface/canvas-subtle` 底 + radius 12 + padding 12/16
- 蒙层 `surface/scrim`
- **禁止**：图标占位、"危险操作！"大写突出

### 8.12 ReadingCard

```
4 月 12 日 · 农历三月廿四 · 清明        ← display serif（品牌签名，§11）
[今日]                                  ← chip pill
                                          ↓ gap 16
Reading 主体段落（body-lg / serif）      ← 1.8 行高，720 宽度
……

建议                                    ← H3 sans
· 建议一句话                  [本周]    ← horizon chip 右对齐
· 建议一句话                  [本月]

─────────────────────────────── divider
[↻ 重新生成]  [⌘ 复制]  [⭐ 收藏]      ← ghost button 行
```

- HeroCard 变体，radius 24，padding 32
- 顶部日期用宋体 display；chip 用 sans
- 主段落 serif `body-lg`，1.8 行高，最多 720 宽
- horizon chip 用 `brand/primary-soft` + 11–12px + tabular-nums
- 底部操作行 ghost + icon 前缀
- 已过期 reading：顶部加 warning notice"当前占卜已超过 24 小时"

### 8.13 Tabs / SegmentedControl

#### Tabs（主导航 / 大区切换）
- 下划线指示器 2px `brand/primary`
- 选中文字 `text/primary` weight 600
- 未选中 `text/secondary` weight 500
- hover `text/primary`
- padding 12 / 18
- 无背景填充

#### SegmentedControl（区域内子切换）
- 容器 bg `surface/canvas-subtle` + radius 999 + padding 4
- 选中项 bg `surface/card` + radius 999 + shadow/1
- 文字 size 13 / weight 500
- 切换动效 ≤ 180ms

> Tab 数 ≤ 4 用 Tabs；> 4 改用 SegmentedControl 或下拉。
> **Tabs 与 SegmentedControl 不共存于同一屏**。

---

## 9. 交互状态规范

### 9.1 通用状态矩阵

| State | 表达手段 | 时长 |
|---|---|---|
| `default` | 基线样式 | — |
| `hover` | 叠加 `overlay/hover`；primary 按钮 +shadow/1；链接下划线 | 120ms ease-out |
| `active` | 叠加 `overlay/active`；按钮回到 shadow/0 | 80ms ease-out |
| `focus` | `overlay/focus-ring` + 边框 `border/brand`；**禁止**浏览器默认 outline | 0 |
| `disabled` | opacity 0.5 + cursor not-allowed；输入框 bg `surface/canvas-subtle` | — |
| `loading` | 文字保持；右侧加 12px loading dot；按钮锁宽度防跳变 | 持续 |
| `selected` | bg `tint/selected`；左侧 2px `brand/primary`（list） | 120ms |
| `error` | 边框 `border/danger`；下方 13px error help | 即时 |
| `empty` | 走 EmptyState 组件 | — |
| `success` | 状态条短暂闪现 200ms `status/success-soft` 底；**不放 toast，不放 confetti** | 200ms |

### 9.2 Loading 表达

| 场景 | 表达 |
|---|---|
| 按钮提交 | 按钮内"生成中…" + 12px dot 透明度呼吸，**不替换按钮成 spinner** |
| 页面初始 | skeleton block：`surface/canvas-subtle` 底，圆角 8，pulse 周期 1.6s |
| Reading 生成 | thinking notice 横条（`status/thinking-soft` 底 + `status/thinking` 左边）+ 文字"时镜正在阅读你的当下…" |
| list 刷新 | 顶部 2px brand 进度条，宽 0→100% 1.2s 内完成 |

### 9.3 思考态动效（防 AI 模板感）

**唯一允许的"思考中"动效**：thinking notice 横条左侧 12px 圆点做 **1.6s 周期的透明度呼吸**（opacity 0.4 ↔ 1，sine easing）。

**禁止**：
- ❌ 跳动小点（`. . .` 循环）
- ❌ 流式打字光标在生成结束后还在闪
- ❌ Spinner（任何方向旋转的图形）
- ❌ 彩条进度
- ❌ Skeleton 在思考态下使用（skeleton 仅页面初始加载用）

### 9.4 动效约束

- 出现 / 消失：200ms ease-out
- hover：120ms ease-out
- 模态打开：240ms ease-out + 缩放 0.98 → 1
- **禁止**：spring / bounce、>250ms 过渡、translateY > 4px 飞入、彩色 fade

---

## 10. 移动端规范

### 10.1 断点

| Token | 宽度 | 设备 |
|---|---|---|
| `sm` | < 640 | 手机 |
| `md` | 640–1024 | 平板 / 窄桌面 |
| `lg` | ≥ 1024 | 桌面 |

### 10.2 触控目标

- 按钮最小高度 **44**（`Button sm` 32 高**仅限桌面**）
- 列表 item padding 16/16
- 可点击 chip 最小 32 高
- 相邻可点击元素之间间距 ≥ 8（防误触）

### 10.3 移动端导航姿态决策

**保留顶部 Tabs，不切换为底部 TabBar。**

**理由**：
- 底 Tab 是 toC APP 默认值（健康 / 运动 / 算命类高频使用），切到底 Tab 会让时镜立刻像"易经 APP 模板"
- 时镜的四个 Tab（今日 / 视角 / 问时镜 / 我）使用频率梯度明显，"今日"是绝对主导，不需要底 Tab 平权
- 顶 Tab + 安静 chrome 是阅读类产品的标志，与品牌"笔记本"叙事一致

### 10.4 输入字号

移动端 input / textarea 默认 **16px**（防止 iOS 自动放大缩放）；label 与正文按桌面规范不变。

### 10.5 字体在移动端

宋体 H1 在小屏渲染较脆弱。在 sm 断点：
- `h1` 字号从 24 → 22
- `display` 字号从 32 → 28
- `body-lg` 字号 16 不变（保证阅读舒适度）

---

## 11. 品牌签名时刻（Brand Signature Moments）

时镜需要"一眼能认出"的视觉锚。锁定**三处不可妥协**的版式，任何团队成员不得修改：

### 11.1 日期序（最重要）

```
4 月 12 日 · 农历三月廿四 · 清明
```

- 字体：宋体 `display`（32 / 600）
- 颜色：`text/primary`
- 字距：0
- 分隔符：` · `（前后各一空格，**用中点不是斜杠**）
- **出现位置**：Today hero 顶部、ReadingCard 顶部、分享卡顶部
- **禁止**：用 sans 替代、改用斜杠 / 短横线分隔、加图标、调整宋体替换

### 11.2 "時" 单字 Brand Mark

```
時
```

- 字体：宋体 600
- 颜色：白（在 brand/primary 底上） / `brand/primary`（在浅底上）
- **出现位置**：应用图标、loading 居中辅助图、空状态居中辅助图、404 页面
- **禁止**：与"镜"字组合成横排 logo（横排时使用"时镜 ShiJing"，单字时只用"時"）、加任何装饰（圆框、印章感、毛笔效果）

### 11.3 会话气泡的"时镜"前缀

```
时镜：当下的天干地支对应「庚午 · 丁卯」……
```

- "时镜：" 部分：宋体 `h3`（16 / 600），颜色 `brand/primary`
- 冒号紧贴，无空格
- 正文：sans `body-lg`（16 / 400），颜色 `text/primary`
- **禁止**：换成 "AI:" / "助手:" / "时镜助手:"、加头像、加 icon、加机器人 emoji

---

## 12. 不要做的设计

### 12.1 视觉效果（成本敏感禁用）

- ❌ 高饱和、装饰性、抢内容的**渐变背景**。kit `AmbientBackground variant="mesh"` 可保留在 app shell 级别，但不得进入 Reading / Form / EntityList 主体。
- ❌ 无边界、全页面、层层嵌套的 **Glassmorphism**。kit 轻 glass 可用于 header、popover、modal、侧边 overlay；长正文和长表单不用 glass 承载。
- ❌ **Neumorphism**（凸起 / 凹陷 + 双向阴影）
- ❌ **Glow / 外发光 / drop-shadow with color**
- ❌ **3D translate hover**（>2px 飞起、整卡放大）
- ❌ **Skeuomorphic 纹理**：木纹 / 大理石 / 皮革 / 金属拉丝
- ❌ **水墨晕染 / 宣纸纤维大面积纹理 / 斑驳**（与 §8.5 HeroCard 允许的 ≤3% SVG 噪点不同）
- ❌ **粒子背景 / 鼠标拖尾 / aurora / floating shapes**
- ❌ **confetti / 烟花 / 全屏 lottie 庆祝**
- ❌ **彩色阴影**（除 elevation-3 略带蓝外，统一冷灰）
- ❌ **>250ms 动画 + bounce easing**
- ❌ **emoji 用作功能 icon**

判断规则：如果替换某个 kit 视觉效果需要大范围重写，但只能带来轻微审美提升，则不替换；改为限制使用范围、加强内容层级。

### 12.2 颜色（绝对禁止）

- ❌ **金色 / 鎏金 / 香槟金**
- ❌ **朱红 + 金**
- ❌ **饱和神秘紫** —— `#6E6A9E` 是受控例外，且仅限思考动态（见 §2.4）
- ❌ **大红 / 玫红 / 粉红**
- ❌ **荧光霓虹**（neon green / pink / cyan）
- ❌ **SaaS 蓝**（#0066FF / #1677FF 一带）
- ❌ **安全黄 #FFD600**
- ❌ **高饱和多色渐变背景**
- ❌ **纯黑 #000 作文字**（用 `text/primary` #1F2520）
- ❌ **多绿强调色**：success 绿与 brand 玉青已经接近，**禁止再引入第三种绿**

### 12.3 让产品显得廉价 / 模板

- ❌ 所有元素圆角 8px（电商模板感）
- ❌ 全部居中 + 大彩色 CTA（landing page 模板感）
- ❌ 大幅 emoji / 卡通插画作 hero
- ❌ 通用人物头像占位
- ❌ 全部卡片同等大小 + 同等阴影
- ❌ 每个空态画小人物 + 鸡汤
- ❌ "Welcome back, [姓名] 👋" 大字 hero
- ❌ "升级解锁" 上揎背景 CTA banner
- ❌ 评分星星 / 进度环 / 五彩 chart
- ❌ 所有按钮带阴影 + 渐变 + icon 三件套
- ❌ 长 onboarding tooltip

### 12.4 让产品像传统算命骗局

- ❌ **八卦图 / 太极图** 作 logo / 装饰 / loading
- ❌ **罗盘 / 风水盘 / 紫微斗数盘** 作日期选择器
- ❌ **十二生肖图标 / 星座轮盘** 作切换器
- ❌ **印章 / 钤印** 作 badge
- ❌ **书法笔触 / 飞白 / 朱砂手写体** 作标题
- ❌ **铜钱 / 八卦币** 作 loading
- ❌ "大师在线 / 专业老师 / 准到吓人" 文案
- ❌ "测一测你的桃花运" scratch-card
- ❌ 运势 5 星评级 / 红绿圆点运势灯
- ❌ "解锁完整解读" 付费拦截
- ❌ "今日仅剩 3 次免费" 倒计时
- ❌ "化解 / 改运 / 辟邪 / 开光" 任何字眼
- ❌ 晕染水墨视频 / 仙气特效
- ❌ 古代人物剪影 / 道士仙人插画
- ❌ 金色繁体字
- ❌ **紫色用于任何静态元素**（思考动态除外，见 §2.4）

### 12.5 让产品像 AI 模板 APP

- ❌ **紫色 / 粉色渐变的 "AI" 按钮**
- ❌ **✨ 魔法棒 / 闪光 icon** 标注 AI
- ❌ **"AI is thinking..."** + 3 个跳动小点（用 §9.3 的呼吸圆点替代）
- ❌ **ChatGPT 气泡 UI 完全照抄**（用 §11.3 的"时镜：" 前缀替代）
- ❌ Hero "Powered by AI" badge
- ❌ 流式打字光标生成结束后还在闪
- ❌ "Magic / 智能 / 智慧" 命名功能
- ❌ "Try a sample prompt" 模板气泡
- ❌ 彩色 token-by-token highlight 显示生成过程
- ❌ 侧栏新建/历史/我的 + 主区聊天的 Workbench 范式

---

## 13. 产品体验基准

本节用于 UI 审计和实现验收。它不新增数据契约，但定义用户可见产品必须如何组织复杂性。

### 13.1 总原则

- 不做 MVP 式空壳。若底层契约要求复杂输入，界面必须给出可理解的结构、预览、错误修复路径，而不是把字段原样摊开。
- 不做伪成功。生成失败、Runtime 不可用、输入不足、校验失败都必须显示具体原因和下一步。
- 不做后台管理页。Person、Relation、Event、View 是产品对象，不是数据库表；列表只是入口，核心必须有详情、上下文和动作。
- 不假设用户知道自己要什么。涉及时窗、观察对象、问题类型、出生证据时，界面必须承认分叉并给出选择框架。

### 13.2 首次使用 / 生辰证据

首次进入 ShiJing 时，`self_subject.natal_inputs` 不能被一个看似有效的默认值掩盖。若当前数据是占位或低置信度，Today 和 Consultation 的主 CTA 应切换为"完善出生信息"或"以低置信度继续"的显式分叉。

生辰录入不是普通表单，必须分成四层：

1. 原始证据：用户知道的日期、时间、地点、历法；
2. 标准化结果：UTC、IANA 时区、经纬度、真太阳时影响；
3. 可生成能力：今日、兆象、区间展望、View Reading 是否可用；
4. 不确定性：缺时间、缺地点、性别未指定、农历闰月证据缺失分别影响什么。

### 13.3 Today

Today 第一屏必须回答三个问题：

1. 现在看谁；
2. 今天的时间锚是什么；
3. 当前能不能生成可信 Reading，不能时缺什么。

生成成功后的 ReadingCard 至少显示：

- 日期序品牌签名；
- Reading.kind / anchor subject；
- summary；
- recommendations；
- uncertainty confidence + caveats；
- 可折叠的 deterministic evidence：stage label、key windows、inputs summary hashes。

### 13.4 View

View 是长期观察工作台，不是 CRUD 列表。每个 View 必须有 detail surface，至少包含：

- anchor subject、subjects、time scope；
- context items / linked events / memory summary；
- 可执行动作：生成区间展望、生成关键窗口、基于该 View 提问；
- 与该 View 关联的 Reading 列表；
- 空上下文时的补上下文入口，而不是只显示"还没有观察视角"。

Event 的创建应从 View 语境内可达。全局 Event 列表可以保留，但不能成为用户理解事件的唯一入口。

### 13.5 Consultation

Consultation 不是泛聊天。提问前必须让用户明确：

- anchor subject；
- 是否绑定某个 View；
- 问题面向的时间窗口；
- 是否涉及其他 subject。

提交后产物仍是 Reading，而不是只有一段聊天回复。对话可以存在，但必须服务于 Reading 解释、追问和上下文补充，不能绕过 deterministic pipeline 给出占星结论。

### 13.6 Me

`我` 页应是个人资料与偏好中枢，不是所有对象的堆叠页。推荐结构：

- 我的出生证据；
- 相关人物；
- 关系；
- 偏好；
- 会话与数据状态。

长表单默认折叠为摘要 + 编辑模式。用户必须能一眼判断"当前资料是否足够生成"。

### 13.7 Failure UX

所有失败态按原因归类：

| 类型 | 用户可见动作 |
|---|---|
| 输入不足 | 跳转到具体字段或打开修复 sheet |
| Runtime 不可用 | 保留草稿 / 问题文本，允许重试 |
| AI 输出不合规 | 显示已拒绝，允许重新生成，不保存 Reading |
| persisted snapshot invalid | 阻断主界面，提供技术详情和清理 / 导出诊断路径 |

技术详情可以折叠，但主消息必须是人能理解的下一步。

### 13.8 审计严重度

| Severity | 定义 |
|---|---|
| P0 | 破坏信任、错读对象、伪成功、核心闭环缺失、会让用户基于错误信息决策 |
| P1 | 主要任务可完成但费力、不确定性表达不足、产品对象退化为 CRUD |
| P2 | 视觉层级、文案、状态、响应式问题，影响品质但不改变核心判断 |

审计报告必须先列 P0，再列 P1/P2；不改变决策的信息不写。

---

## 附录 A · Token 命名约定

```
{category}/{role}[-{state}]
```

落地为 CSS variable 时统一前缀 `--shijing-`：

```
--shijing-brand-primary: #2F5F57;
--shijing-text-primary: #1F2520;
--shijing-status-thinking: #6E6A9E;
--shijing-shadow-1: 0 1px 2px rgba(15, 23, 38, 0.04), 0 1px 1px rgba(15, 23, 38, 0.03);
--shijing-radius-xl: 16px;
--shijing-space-24: 24px;
--shijing-tint-selected: #E7EDE8;
```

业务组件禁止写死 hex。px 值应集中在 `--shijing-*` token、kit wrapper 或低层 layout utility 中；不要为了数值纯度重写 kit 内部。

---

## 附录 B · nimi ↔ shijing Token 映射

实施时按此表建立 semantic alias。优先新增 `--shijing-*`，再把它映射到 kit token 或局部覆盖；不要求把所有 `--nimi-*` 从代码中一次性清除。

| 旧（kit） | 新（shijing） |
|---|---|
| `--nimi-surface-canvas` | `--shijing-surface-canvas` |
| `--nimi-surface-card` | `--shijing-surface-card` |
| `--nimi-surface-panel` | `--shijing-surface-card-quiet` |
| `--nimi-text-primary` | `--shijing-text-primary` |
| `--nimi-text-secondary` | `--shijing-text-secondary` |
| `--nimi-text-muted` | `--shijing-text-muted` |
| `--nimi-border-subtle` | `--shijing-border-subtle` |
| `--nimi-border-strong` | `--shijing-border-strong` |
| `--nimi-action-primary-bg` | `--shijing-brand-primary` |
| `--nimi-action-primary-fg` | `--shijing-text-on-brand` |
| `--nimi-action-ghost-hover` | `--shijing-overlay-hover` |
| `--nimi-status-danger` | `--shijing-status-danger` |
| `--nimi-status-success` | `--shijing-status-success` |

---

## 附录 C · 字体回退方案

**问题**：Windows 默认无 Source Han / Noto Serif，会回退到 SimSun，标题渲染偏锐利偏老气。

**方案**（按优先级）：

1. **Tauri 桌面端 bundle**：随应用打包 Noto Serif SC subset（仅常用 3500 汉字 + 标点），约 80kb。一次性解决所有桌面端宋体回退问题。
2. **Web 子集加载**：浏览器场景按需加载 Noto Serif SC subset CSS，font-display: swap。
3. **检测降级**：JS 检测命中 SimSun fallback 时，将 H1 / H2 字重从 600 降到 500，并放大 1px，抵消 SimSun 的"硬"感。

---

## 附录 D · 第一阶段视觉演进顺序

v1 文案重构期保留了 kit 玻璃 token（`material="glass-chrome"`、`AmbientBackground variant="mesh"` 等）。v1.2 不再要求先移除这些能力，而是先修正产品体验闭环和不受控的全局样式。

1. 建立 `--shijing-*` semantic alias，不污染 kit 全局 token。
2. 保留 shell header / account menu / popover 的 kit glass；确保内容层对比度、边界和滚动稳定。
3. 移除不受控的产品区兜底 glass：`.shijing-tab > div { background... blur... }` 这类选择器不得把所有业务块自动变成卡片。
4. ReadingCard、NatalEvidencePanel、ViewWorkspace 优先做领域组件；内部继续复用 kit Surface / Button / Popover。
5. 只有在 kit 覆盖能力探测证明无法满足可读性或交互时，才局部替换 kit 组件。

---

## 附录 E · 暗色模式过渡

v1.2 主体仍以 Light 交付，但新业务组件颜色全部走语义 token。
暗色 token（§2.5 草表）作为后续 hot-fix 落地；不得因为暗色模式推迟核心产品闭环。

---

## 附录 F · 实施前置任务（不可跳过）

实施前必须完成的"地基"工作：

### F.1 kit 覆盖能力探测（半天）

挨个验证 `@nimiplatform/kit` 的下列组件是否可以通过 props / className / wrapper 满足 ShiJing 体验要求：

- `Surface` 的 `material` 系列
- `AmbientBackground` 的 `variant`
- `OverlayShell` 的 chrome 样式
- `Avatar` / `NimiTabs` / `Popover` 的内部颜色

输出三张清单：

1. **可直接复用**：无需封装；
2. **需 ShiJing wrapper**：绑定 token、copy、状态；
3. **必须自建领域组件**：kit 无法表达 Reading / Natal / View 的领域结构。

结果决定每个组件的实现路线，不决定是否全量重做 kit。

### F.2 多设备纸色验证（半小时）

`surface/canvas` 在三种设备上抽查不偏黄：
- sRGB 校色屏（设计师 Mac）
- iPhone OLED（高色温模式）
- 安卓中端机（任意主流型号）

如偏黄严重，启用备用 `surface/canvas-neutral` `#F4F4F1`。

---

## 附录 G · 实施验收清单

任何新页面 / 新组件，上线前回答：

- [ ] 是否保留了可复用的 kit 能力，且没有无理由重做？— **是**
- [ ] 是否只在 shell / overlay / secondary panel 使用轻 glass？— **是**
- [ ] 是否引入了抢内容的装饰性渐变背景？— **没有**
- [ ] 是否使用了金色、紫色（除思考态）、SaaS 蓝？— **没有**
- [ ] 是否出现八卦、太极、罗盘、印章、铜钱？— **没有**
- [ ] 是否使用 ✨ / 🔮 / 🎉 / 🪄 等 emoji？— **没有**
- [ ] 新增 ShiJing UI 字号在 8 档梯度内？— **是**
- [ ] 产品层新增间距优先使用 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64？— **是**
- [ ] 新增业务组件圆角在 6 档梯度内？— **是**
- [ ] 强调色只有玉青一种？— **是**
- [ ] 阴影只用 0 / 1 / 2 / 3 四档？— **是**
- [ ] `status/thinking` 紫灰仅出现在思考动态？— **是**
- [ ] 阅读容器正文使用 `body-lg`？— **是**
- [ ] 同屏强调色使用不超过两处？— **是**
- [ ] 错误主消息是人话，技术 code 在折叠区？— **是**
- [ ] 按钮没带不必要的阴影 / 渐变 / 图标三件套？— **没有**
- [ ] 新业务组件颜色通过 `--shijing-*` 或 kit semantic token 引用？— **是**
- [ ] 移动端按钮 ≥ 44 高？— **是**
- [ ] 包含日期场景是否使用"日期 + 农历 + 节气"宋体签名版式？— **是**
- [ ] 首次使用是否不会把占位出生数据伪装成可生成状态？— **是**
- [ ] Reading 是否展示 anchor、uncertainty、recommendations 和 evidence 入口？— **是**
- [ ] View 是否是工作台，而不是只有 CRUD 列表？— **是**
- [ ] 失败态是否给出下一步，而不只是技术 code？— **是**

任何一项答错，不予上线。

---

## 修订日志

| 日期 | 版本 | 变更摘要 |
|---|---|---|
| 2026-05-26 | v1.2 | 将设计文档从"视觉替换优先"修正为 kit-first 工作基准；允许受控保留 kit glass / mesh；新增产品体验基准、审计严重度和失败恢复要求。 |
| 2026-05-25 | v1.1 | 初版定稿。主品牌色采用玉青 #2F5F57（五行木依据）；AI 思考色 #6E6A9E + §2.4 严格使用纪律；新增品牌签名时刻、移动端规范、暗色 token 草表、kit 覆盖前置任务等。 |

---

**下阶段（v1.3 候选）**：Reading evidence UI、出生证据修复 flow、ViewWorkspace 组件、暗色模式正式落地。插画系统延后，不能优先于核心产品闭环。
