# Design QA — 年镜出生资料提示

**Source visual truth**

- Current problem state: `/var/folders/5h/yywrq1bn0w75bzmcrf7l8rc40000gn/T/codex-clipboard-a53ca505-4cbc-49d9-ab80-3468989d65b9.png`
- Target 月镜 notice: `/var/folders/5h/yywrq1bn0w75bzmcrf7l8rc40000gn/T/codex-clipboard-1bd625b5-15b0-42bd-9b99-4548ed081964.png`

**Implementation evidence**

- Rendered 年镜 screenshot: `.nimi/local/design-qa/nianjing-missing-natal.png`
- Rendered 月镜 control screenshot: `.nimi/local/design-qa/yuejing-missing-natal.png`
- Full-view comparison: `.nimi/local/design-qa/yuejing-reference-vs-nianjing-implementation.png`
- Focused notice comparison: `.nimi/local/design-qa/notice-style-focused-comparison.png`
- Route: `http://127.0.0.1:1430/dev-preview.html`
- State: 八字子平法；本人出生资料为未填写的 scaffold；年镜已选中。
- Viewport: 1320 × 900 CSS px; `devicePixelRatio = 1`.
- Source pixels: 1320 × 900. Implementation pixels: 1320 × 900. No density normalization was needed.

**Findings**

- No actionable P0/P1/P2 differences in the requested notice state.
- Fonts and typography: the implementation uses the same centered secondary-text treatment and readable Chinese copy pattern as 月镜.
- Spacing and layout rhythm: notice height is 50.8 px in both rendered 月镜 and 年镜 states, with identical `14px 18px` padding and `12px` radius. 年镜 remains wider because its page content is not constrained to the 月镜 calendar width; this is the existing intended page layout.
- Colors and visual tokens: both rendered notices resolve to the same background, border, text color, radius, padding, and alignment values.
- Image quality and asset fidelity: the notice contains no image assets; none were introduced or substituted.
- Copy and content: 年镜 now reads `请先在「设置 → 本人」中填写出生信息,年镜会据此自动推算。`; the internal `calculation_sex` detail is absent.

**Interaction and runtime checks**

- Switched between 月镜 and 年镜 and confirmed both notice states render.
- 年镜 contains exactly one readable notice, zero `.shijing-failure-banner` elements, and zero leaked `calculation_sex required when DaYun is required` strings.
- Browser console warnings/errors: none.

**Comparison history**

- Initial supplied 年镜 state: P1 usability mismatch — a technical failure banner exposed an internal English calculation prerequisite.
- Fix: added the same capability-aware natal readiness gate used by 月镜 before 年镜 direct-display derivation, and rendered the 年镜 copy through its matching notice style.
- Post-fix evidence: full-view and focused comparisons above show the readable notice and matching visual treatment; no P0/P1/P2 findings remain.

**Implementation checklist**

- [x] Replace technical failure exposure with readable 年镜 guidance.
- [x] Keep deterministic generation fail-close behavior unchanged.
- [x] Match 月镜 notice typography, spacing, colors, border, radius, and alignment.
- [x] Verify the rendered state, tab interaction, and console.

**Follow-up polish**

- None required for this request.

**Existing visual harnesses**

- `dev-mingjing.html` mounts the MingJing route with `method_profile_id=ziwei_sanhe_v1`.
- `dev-hejing.html` mounts the HeJing relationship surface.
- `dev-nianjing-overview.html` mounts the NianJing year-overview modules with synthetic output.
- These files remain local review harnesses only. Product authority remains under `.nimi/spec/shijing/canonical/**`.

final result: passed
