Current candidate (2026-11-12): ShiJing `0.1.11`, SDK/Kit/native `0.23.0`, App Tools `0.15.0`, and Nimi Coding `0.7.0`. Desktop and Web reuse the same six-mirror product, deterministic calculations, complete ShiJingSpace validator and Runtime-private JSON asset format. Kit owns Nimi identity/connection lifecycle. Every product mount captures its client and abort signal; data, AIConfig readiness, pending writes and late wording results cannot move into a replacement connection. Desktop follows Home; Web uses official Nimi login with no separate ShiJing account.

The checkout consumes complete candidate archives via explicit `pnpm-workspace.yaml` overrides under ignored `.nimi/local/packages/rc11`. These were built from Nimi `7a9ce8e006b0e297ed792a448327481bd91c0b8e`; the following product commit `385b79003` changes release tests only. The Windows native archive uses the production trust profile. The complete snapshot is one atomic file: use one editing client at a time. Local candidate consumption does not establish public package availability.

Run pnpm install --frozen-lockfile, pnpm sync and pnpm check:platform. pnpm dev uses Desktop supervision and an explicitly selected existing registration. pnpm dev:web uses the HTTPS source declared in nimi.app.yaml; copy .env.web.example to .env.web.local and supply a trusted certificate for that origin. Registry admission and the first Home confirmation are separate prerequisites that these commands do not grant. pnpm build:web builds browser output; pnpm build keeps the existing Desktop build.

Current native acceptance: Windows launched through Desktop supervision with the selected existing App registration. A fictional profile completed first setup and deterministic calculation, generated a real AI natal reading, and restored that same saved reading after a full App exit and restart. The existing 890 App tests cover unchanged business source; current App Tools checks, renderer/Electron type checks and builds pass. Daily activity publication, Catalog installation, production Web login/direct access and cross-device persistence remain `NOT-VERIFIED`. No public release or installation parity is claimed. Older evidence below retains its original scope.

[App introduction and usage](NIMI_APP.md)

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

> 当前 `0.1.11` 候选使用 SDK／Kit/native `0.23.0`、App Tools `0.15.0` 和 Nimi Coding `0.7.0`。`pnpm-workspace.yaml` 显式选用 `.nimi/local/packages/rc11` 中包含 Runtime 轻心跳协议和最新 bundled App ABI 的完整归档。干净开发环境需要取得这些实际归档，版本号相同不能替代相同源码产物。公开发布前需在组件发布后改为公共 registry 解析。下方历史发布验证只适用于当时记录的组合。

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

**Local chrome teardown patch — 2026-10-26.** The explicit `pnpm-workspace.yaml` override selects the complete Kit 0.21.1 development archive at `.nimi/local/platform-icons/nimiplatform-kit-0.21.1-chrome.tgz`. It backports canonical fix `6b3ef1116` onto published Kit 0.21.0: window/WebContents destruction cleanup is idempotent and never reads a destroyed BrowserWindow getter. SDK 0.21, public chrome declarations and native carrier dependencies retain their existing versions. This archive is unpublished; clean development checkouts need the same complete archive, and production preflight still requires registry resolutions. App-specific business journeys and Windows interaction with this patch remain NOT-VERIFIED.

**当前候选 — 2026-11-12。** 上述历史归档已被本轮 `rc11` 完整组件归档覆盖。真实 Windows 监管开发路径已完成虚构资料建档、确定性排盘、AI 命镜解读、保存和完整退出后恢复；恢复使用同一条已存解读，没有重新生成。当前包输出为 `dist/nimi-app/nimi.shijing-0.1.11-windows-x86_64.nimiapp`；重新 build／pack 后已从 Home 本地导入、安装并实际启动受管 payload。安装版按生产 native profile 要求固定 Runtime 服务，而当前联验环境按约定保持该服务停止，因此正确显示 `runtime-service-unavailable / start_fixed_runtime_service`，未继续安装版业务。此前 890 项测试结果仍对应未改动的 App 业务源码。安装版业务、生产 Realm 登录、Web 直连、跨端持久化、Catalog 安装和公开依赖解析仍为 `NOT-VERIFIED`。
