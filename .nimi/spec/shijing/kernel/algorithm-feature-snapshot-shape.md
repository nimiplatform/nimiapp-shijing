# SJG-ALGO-08 Feature Snapshot Shape Appendix

This appendix is a normative part of [algorithm-contract.md](algorithm-contract.md)
SJG-ALGO-08. It carries the field-level shape for the deterministic
`AstrologyFeatureSnapshot` envelope so the main algorithm contract can stay
AI-context bounded without changing rule semantics.

```text
AstrologyFeatureSnapshot {
  method_profile: MethodProfile
  mirror_kind: "rijing" | "yuejing" | "nianjing" | "mingjing" | "shijing"
  canonical_window: CanonicalMirrorWindow
  common: CommonDrivers
  method_evidence: MethodEvidence
}

CommonDrivers {
  stage_drivers: StageDriver[]
  key_windows: KeyWindowFeature[]
  yuejing_tendency_drivers: YueJingTendencyDriver[]
  nianjing_phase_drivers: NianJingPhaseDriver[]
  nianjing_inflection_drivers: NianJingInflectionDriver[]
  uncertainty_inputs: UncertaintyInput[]
}

MethodEvidence =
  | { method_id: "bazi_ziping_v1"; bazi: BaziEvidence }
  | { method_id: "ziwei_sanhe_v1"; ziwei: ZiweiEvidence }
  | { method_id: "qizheng_siyu_guolao_v1"; qizheng_siyu: QizhengSiyuEvidence }

CanonicalMirrorWindow {
  start_utc: string
  end_utc: string
  basis_time_zone: string
  scope_kind: "daily" | "rolling_30_day" | "long_horizon" | "natal" | "consultation"
}

BaziEvidence {
  self_subject: BaziSubjectChart
  related_persons: BaziSubjectChart[]
}

BaziSubjectChart {
  subject_ref: SubjectRef
  natal_chart: NatalChartSnapshot
  dayun?: DayunSnapshot
  cycle_snapshot: CycleSnapshot
  interpretation?: BaziInterpretation   // bazi_ziping_v1 interpretive layer (SJG-ALGO-15)
}

BaziInterpretation {
  pillars: BaziPillarFeatures[]         // present pillars only
  strength: BaziStrength
  yong_shen: YongShen
  natal_branch_relations: BaziBranchRelation[]   // 合冲刑害破 among natal branches
}

BaziPillarFeatures {
  position: "year" | "month" | "day" | "hour"
  ten_god: string                       // 十神 of the stem vs day master (日柱 → 比肩)
  hidden_stems: HiddenStem[]            // 藏干, primary → residual
  nayin: string                         // 纳音
  terrain: string                       // 日主 十二长生 at this branch
}

HiddenStem {
  stem: string
  weight_class: "primary" | "middle" | "residual"   // 本气 | 中气 | 余气
}

BaziStrength {
  band: "极弱" | "偏弱" | "中和" | "偏强" | "极强"
  support_ratio: number                 // bounded 0..1 ordinal evidence, NOT a luck score
  basis: string[]
}

YongShen {
  yong: Element[]                       // 用神
  xi: Element[]                         // 喜神
  ji: Element[]                         // 忌神
  tiaohou?: Element                     // 调候用神 when the season is extreme
  basis: string[]
}

BaziBranchRelation {
  kind: "六合" | "三合" | "相冲" | "相害" | "相刑" | "相破"
  positions: ("year" | "month" | "day" | "hour")[]
}

Element = "wood" | "fire" | "earth" | "metal" | "water"

ZiweiEvidence {
  self_subject: ZiweiSubjectChart
  related_persons: ZiweiSubjectChart[]
}

ZiweiSubjectChart {
  subject_ref: SubjectRef
  five_elements_class: string   // 五行局, e.g. "火六局"
  soul_star: string             // 命主
  body_star: string             // 身主
  soul_palace_branch: string    // 命宫地支
  palaces: ZiweiPalace[]        // twelve, in fixed branch order
}

ZiweiPalace {
  index: number
  name: string                  // 命宫 | 兄弟 | 夫妻 | ... | 父母
  heavenly_stem: string
  earthly_branch: string
  is_soul: boolean
  is_body: boolean
  major_stars: ZiweiStar[]
  minor_stars: ZiweiStar[]
  decadal_start_age: number     // 大限 start age for this palace
  decadal_end_age: number
}

ZiweiStar {
  name: string
  brightness: string            // 庙旺得利平不陷 (may be empty)
  mutagen: "" | "禄" | "权" | "科" | "忌"   // 生年四化
}

QizhengSiyuEvidence {
  self_subject: QizhengSiyuSubjectChart
  related_persons: QizhengSiyuSubjectChart[]
}

QizhengSiyuSubjectChart {
  subject_ref: SubjectRef
  canonicalization_hash: string
  chart_basis: QizhengSiyuChartBasis
  bodies: QizhengSiyuBody[]      // 七政 + 四余, method-private
  houses: QizhengSiyuHouse[]     // twelve equal houses from ascendant in v1
}

QizhengSiyuChartBasis {
  birth_utc: string
  ascendant_longitude: number
  day_night: "day" | "night"
  zodiac_model: string
  house_model: string // raw deterministic id; renderer must map to product-facing copy
  mansion_model: string // `28-equal-mansion-v1` is an admitted v1 approximation
  siyu_model: string // raw deterministic id; 罗喉=ascending node, 计都=descending node
  ephemeris_version: string
}

QizhengSiyuBody {
  key: string
  label: string
  kind: "qizheng" | "siyu"
  longitude: number
  latitude?: number
  zodiac_sign: string
  mansion: string
  house_name: string
  position_class: string
  provenance: string
}

QizhengSiyuHouse {
  index: number
  name: string
  start_longitude: number
  end_longitude: number
  body_keys: string[]
}

NatalChartSnapshot {
  subject_ref: SubjectRef
  canonicalization_hash: string
  year_pillar?: GanzhiPillar
  month_pillar?: GanzhiPillar
  day_pillar?: GanzhiPillar
  hour_pillar?: GanzhiPillar
  day_master?: string
  missing_pillars: ("year" | "month" | "day" | "hour")[]
}

GanzhiPillar {
  stem: string
  branch: string
}

DayunSnapshot {
  required: boolean
  direction?: "forward" | "reverse"
  start_age_years?: number
  current_period_start_utc?: string
  current_period_end_utc?: string
  current_pillar?: GanzhiPillar
}

CycleSnapshot {
  window_start_utc: string
  window_end_utc: string
  annual_pillar?: GanzhiPillar
  monthly_pillars: TimedPillar[]
  daily_pillars: TimedPillar[]
  markers: CycleMarker[]
}

TimedPillar {
  start_utc: string
  end_utc: string
  pillar: GanzhiPillar
}

CycleMarker {
  kind: string
  strength: "low" | "medium" | "high"
  start_utc: string
  end_utc: string
  subject_refs: SubjectRef[]
  source: "natal" | "dayun" | "annual" | "monthly" | "daily"
}

StageDriver {
  stage_label: "进时" | "收时" | "养时" | "转时" | "守时"
  marker_refs: string[]
  explanation_key: string
}

KeyWindowFeature {
  start_utc: string
  end_utc: string
  label: "transition" | "support" | "closure" | "maintenance"
  driver_refs: string[]
  subject_refs: SubjectRef[]
}

YueJingTendencyDriver {
  date: string
  concern_tag_ref: string
  tendency_class: "supportive" | "steady" | "watch" | "blocked" | "turning"
  driver_refs: string[]
}

NianJingPhaseDriver {
  concern_tag_ref: string
  start_date: string
  end_date: string
  nature: "supportive" | "steady" | "watch" | "blocked" | "turning"
  driver_refs: string[]
}

NianJingInflectionDriver {
  concern_tag_ref: string
  date: string
  date_window?: { start_date: string; end_date: string }
  kind: "dayun_boundary" | "annual_transition" | "monthly_transition" | "marker_cluster"
  driver_refs: string[]
}

UncertaintyInput {
  code: string
  severity: "info" | "caveat" | "degrade" | "fail_close"
  subject_ref?: SubjectRef
}
```
