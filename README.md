# 时镜 (ShiJing)

> 专业 AI 个人命理解读伙伴，融汇传统干支节气与现代心智反思。

时镜（ShiJing）是一款桌面端个人命理解读与生活节律观察工具。它将古典八字、干支历法、二十四节气与大运起伏的**确定性算法排盘**，与大语言模型的深度洞察力相结合，为个人成长、关系理解与生活抉择提供一面清晰、温和而深邃的镜子。

---

## 六大时空透镜 (The Six Mirrors)

时镜将时间与生命的律动划分为六个相互映照的视角：

1. **日镜 (Daily Reflection)**
   洞察当天的五行能量与干支流转，记录情绪与行动，找到适合专注、休养或决断的日常节奏。
2. **月镜 (Monthly Calendar)**
   以 30 天为一个节律周期，观察运势的波峰与转折，提前为关键事项预留精力。
3. **年镜 (Annual Horizon)**
   审视流年大运的交替，把握人生长周期的关键拐点与成长主题。
4. **命镜 (Natal Self-Projection)**
   基于出生时间的终身命盘投射，剖析天生心性、思维模式、潜在盲点与人生底色。
5. **合镜 (Relationship Workbench)**
   将自己的命盘与重要他人的命盘放在一起对照，理解彼此的性格张力、相处默契与沟通之道。
6. **问镜 (Consultation Session)**
   针对眼前的具体困惑（事业转折、感情抉择、合作规划）展开深度多轮咨询对话，以排盘依据为依托，拒绝模棱两可的套话。

---

## 算法确定性与 AI 表达

- **严谨的排盘内核**：采用纯 TypeScript 实现的确定性算法引擎（`bazi_ganzhi_jieqi_dayun_v1`），精确计算干支、节气交节时刻与起运岁数，排盘结果严格可重现。
- **富有文学温度的解读**：Nimi Runtime 调度的语言模型基于确定性排盘数据进行语义阐释，将生硬的术语转化为富有启发性的人生体悟。
- **生辰隐私安全**：生辰数据、盘面记录与咨询对话均保存在本地受管存储中，已保存内容保留在本地。生成新的 AI 解读需所选模型能力可用；使用 Cloud 路由时，当次所需的排盘与提问上下文会发送给所选服务商。

---

## 技术架构

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **桌面宿主** | Desktop-supervised Electron | 原生窗口管理与受保护 Nimi 访问 |
| **前端界面** | React 19 + Vite + Tailwind CSS | 基于 `@nimiplatform/kit` 打造的沉浸式新中式美学 |
| **算法引擎** | Pure TypeScript (`src/product/astrology/`) | 确定性干支、节气与大运排盘流水线 |
| **AI 调度** | `@nimiplatform/sdk` (`text.generate`) | 统一调用本地或云端语言模型 |

---

## 本地开发与测试

### 环境要求
- Node.js ≥ 24, pnpm ≥ 10
- 运行中的 Nimi Desktop / Runtime 环境

### 启动开发

> 当前源码使用已发布的 SDK 0.21.0、Kit/native 0.21.0、App Tools 0.13.0 和 Nimi Coding 0.6.5，依赖直接从公共仓库解析，无需本地归档覆盖。运行 `pnpm install --frozen-lockfile` 即可安装锁文件记录的版本。下方的历史发布验证仅适用于当时记录的依赖组合。

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 启动桌面端监管的 Electron 开发环境
pnpm dev
```

### 验证与打包
```bash
# 运行单元测试与类型检查
pnpm test
pnpm typecheck

# 验证规范与打包
pnpm exec nimi-app check --production
pnpm exec nimi-app build --target windows-x86_64 --production
pnpm exec nimi-app pack --target windows-x86_64 --production
```

---

## 免责声明

时镜旨在提供文化探索、心智反思与生活节律参考，不构成医疗、法律或金融投资决策建议。命运掌握在每个人当下的选择与行动中。

---

## 发布与验收状态 (Release & Verification)

- **已核对的公开发布版本**: [v0.1.10](https://github.com/nimiplatform/nimiapp-shijing/releases/tag/v0.1.10)
- **Registry 准入**: [#84](https://github.com/nimiplatform/nimi-app-registry/pull/84) (macOS arm64 与 Windows x64)
- **原有记录的依赖组合**: SDK 0.21.0, Kit/native 0.19.3, App Tools 0.12.1, Nimi Coding 0.6.5
- **原有发布记录中的验证路径**: macOS arm64 目录安装、生辰数据记录（1988-01-01 12:00 上海）、确定性排盘计算、AI 命镜解读生成以及冷启动数据持久化验证通过。（Windows GUI 安装标记为 `NOT-VERIFIED`）。
