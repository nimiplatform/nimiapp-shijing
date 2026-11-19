## Hosted Web release

ShiJing uses product ID `nimi.shijing` and slug `shijing`. Its intended introduction is `https://nimi.ai/apps/shijing`, and its Web release builds for `https://shijing.nimi.xyz/`. A protected `web-v<version>` tag builds the static `dist-web` directory, pins its code and lazy assets to that version, and publishes the exact ZIP with GitHub provenance. Opening the Web app from the public site requires a Registry maintainer to approve the concrete release and the platform to deploy it.

The lockfile uses the public npm releases of SDK `0.24.0-rc.10`, Kit and its native packages `0.24.0-rc.16`, and App Tools `0.16.0-rc.9`. Run `pnpm install --frozen-lockfile`, `pnpm run check:platform` and `pnpm run build:web:release`. Runtime access requires Nimi login and first confirmation in Home. From an empty Web store, complete intake, save a usable 日镜 reading and then ask in 问镜. The model-configuration recovery action on the Web opens ShiJing's own AI settings.

## Local cohort record — 2026-11-15

ShiJing remains **0.1.11** with the original product and data format. Complete SDK **0.24.0-rc.2**, Kit **0.24.0-rc.4**, Windows native **0.24.0-rc.1** and App Tools **0.16.0-rc.2** archives are selected from `.nimi/local/packages/integration-20261114-android-http-rc.4` through explicit overrides and the lockfile. Kit's declaration remains `^0.24.0-rc.1`; the override selects rc.4. Nimi Coding 0.7.0 and Electron 45 remain. Old archives are preserved. The installed Android plugin now uses `CoordinationHttpClient`, whose existing platform tests cover fresh connections after idle without retry, cookies or redirects; this does not assign a cause to every historical connection error.

The newer App Tools rejected the previous flat local Web configuration. Its original 4476 origin, callback and `nimi.shijing.web.dev` client now live under `local_development.web.local`; App Access and capability declarations are unchanged. Use `pnpm dev:web -- --realm local`, and set `NIMI_DEV_REALM=local` for Web/mobile builds. Normal tool sync updated its owned guides. Offline frozen installation, App Tools check, renderer/Host types, **62 existing consumption/persistence/scope/build tests**, Desktop/Web/mobile builds and offline Android assembly passed. No business-source change or new native registration was needed.

The signed APK is `.nimi/local/android-candidates/20261115-065810-kit-rc4/shijing-0.1.11-kit-rc4-debug.apk`: **14,279,375 bytes**, SHA-256 `69EF4D11B8AC6F0A33D483CB84578EB7E224A89C6C311CCA46323D98D3DE1150`, certificate SHA-256 `756e56a08527a94e830921233bc80f31121fd0fe57dccef1535e27e9eb0a6585`. This is local development, not publication or a new source grant.

Real Web login reused Halliday and the approved source. Mounting the daily page automatically entered the existing generation path for **2026-11-15**; no Generate/Refresh action was clicked. Its terminal page contained the day wording “潜流涌动，于静处积蓄生机” and the existing test concern. Settings showed `saved` / `valid` and the applied local **Gemma 4 26B Q4 text-only v2** configuration. No visible call count or duration was measured. The original profile remained complete behind its confirmation mask, and the original natal AI text beginning “身心均衡、才华与理性并存的稳健格局。” reopened without regeneration. Disconnect and the first explicit Connect restored the same dated daily content. This is an automatically triggered generation-and-readback slice, not a no-AI read-only claim.

The APK was installed with `install -r` and opened from its system icon. The official account page took time to load, then the original flow reached Halliday Continue and returned without reload or repeated sign-in. Android retained the **Android 布局验收** concern and the original natal AI text beginning “灵动才华与内在秩序的平衡之旅”. Its first readable product state already contained the complete current-date daily wording “稳扎稳打，积微成著”; the intervening generation stage/call count was not observed or inferred, and no Web result was copied to this source. After **101 seconds of natural foreground idle**, formal Disconnect followed by the first Connect succeeded and read back the same daily content without Refresh or replay. Screenshots: `.nimi/local/ui-audit/2026-11-15-rc4-web-reconnect.jpg` and `2026-11-15-rc4-android-first-connect.png`. Earlier device, network and release limits below remain.

## Previous candidate — 2026-11-13

Previous candidate: ShiJing `0.1.11`, SDK/Kit/Windows source-native `0.23.1-rc.1`, App Tools `0.15.1-rc.1`, and Nimi Coding `0.7.0`. Fixed-content archives are selected by declarations, overrides and the lockfile under `.nimi/local/packages/web-android-20261113-rc.1`; content changes require a new candidate version. Desktop, Web and Android reuse the same six-mirror product, calculations, complete ShiJingSpace validator and Runtime-private JSON format. Kit owns Nimi identity/connection. Each product mount captures its client and abort signal; late work cannot move to a replacement connection. There is no separate ShiJing account.

Local Android acceptance (2026-11-13): the debug APK ran on Android Emulator 37.2.13, API 36 Google APIs x86_64, using existing Halliday / My PC (Runtime/Home started from Nimi `6917fc6dd`). System Chrome returned through `ai.nimi.apps.shijing.dev:/oauth/callback`; source `nimi.shijing.android.dev` revision 1 was admitted and confirmed in Home. A fictional profile (1990-11-12, Guangzhou, 09:00) and one test concern completed intake, deterministic natal calculation and real AI reading. The fixed RC cohort was installed/synced/checked, rebuilt for Web/Android and installed over the same APK. Normal login recovered “Android 布局验收”, the chart and the existing AI reading headed “灵动才华与内在秩序的平衡之旅”; no regeneration was requested. The first new login reported a Realm network error; the next normal login succeeded, with that intermittent cause still unresolved. The Android source has its own private storage scope; Web/native data was neither copied nor reset.

UI/UX audit used the real desktop browser, 412px browser viewport and Android WebView. It corrected wrapping navigation labels, small touch targets, duplicated intake headings, an unlabelled settings entry, absent reasons when saved birth data could not support a full chart, hidden almanac content stretching the visible overview, and a viewport-height child clipping the header below the account bar. The six mirrors, explicit AI action and visible account/Runtime remain available. Screenshots are under `.nimi/local/ui-audit/2026-11-13-web-android` (the temporary Web connection-error screenshot is excluded). Keyboard/screen-reader completeness, other Android devices, public App Links, distribution and actual cross-network access are **NOT-VERIFIED**. This is a local test app, not a public Android release.

Android development: install JDK 21 and Android SDK, set `JAVA_HOME` / `ANDROID_HOME`, then use `pnpm sync:android` and the generated Android Gradle project (`assembleDebug`), or `pnpm dev:mobile`. `capacitor.config.ts` declares the local test identity. The debug manifest alone admits its scheme; debug cleartext is limited to loopback for local Realm/login access. On the emulator, reverse ports 3000 and 3002 to the existing test services. Registry admission must match the actual debug signing certificate; neither building nor a browser login grants Home access. Release App Links and their Registry review remain separate work.

Build regression: Web/mobile HTML entry selection now runs before Vite resolves scripts. A real build-module-graph test prevents Desktop session code from replacing the remote entry. The 892 tests, renderer/Electron types and lint pass; Android Gradle debug build and real installed APK are verified. Generated mobile assets are excluded from lint and Vite watch input.

The earlier `rc11` dependency archives used the production native trust profile. They have been replaced for this explicitly source-development task by the complete fixed RC cohort above, recorded by Nimi `2f7c4e372`; no installed production Runtime was used. The complete application snapshot is still one atomic file: use one editing client at a time. Local candidate consumption does not establish public package availability.

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
