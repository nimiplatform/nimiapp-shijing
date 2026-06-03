// Human-readable Chinese messages for natal-input build / validation errors.
// The editors surface these instead of raw codes like `latitude_invalid`, so a
// user who left required fields blank gets actionable guidance.
//
// Keyed by the leaf error code (build-step codes, validator codes, and the
// `birth_datetime_underivable` reasons all share one flat dictionary).

const MESSAGES: Record<string, string> = {
  // location — the common "left it blank" cases
  latitude_invalid: '请填写出生地点的纬度（-90 ~ 90，例如广州约 23.13）。',
  birth_location_latitude_invalid: '出生地点纬度无效，请填 -90 ~ 90 之间的数值（例如广州约 23.13）。',
  longitude_invalid: '请填写出生地点的经度（-180 ~ 180，例如广州约 113.26）。',
  birth_location_longitude_invalid: '出生地点经度无效，请填 -180 ~ 180 之间的数值（例如广州约 113.26）。',
  timezone_conversion_failed: '请填写有效的 IANA 时区（例如 Asia/Shanghai）。',
  birth_location_iana_time_zone_invalid: '请填写有效的 IANA 时区（例如 Asia/Shanghai）。',
  birth_location_iana_time_zone_offset_only_forbidden:
    'IANA 时区请填地区名（例如 Asia/Shanghai），不要用 +08:00 这样的偏移量。',

  // date / time
  local_date_invalid: '请填写有效的出生日期。',
  local_time_invalid: '请填写有效的出生时间（HH:MM）。',
  raw_birth_input_local_date_text_empty: '请填写出生日期。',
  natal_inputs_birth_datetime_utc_invalid: '出生时刻无效，请检查日期、时间与时区。',

  // lunar
  lunar_field_invalid: '农历年/月/日填写有误，请检查。',
  raw_birth_input_lunar_field_invalid: '农历年/月/日填写有误，请检查。',
  raw_birth_input_lunar_missing_leap_month_evidence: '请补全农历闰月信息。',
  raw_birth_input_gregorian_must_not_carry_lunar_fields: '公历输入不应携带农历字段。',

  // enums
  natal_inputs_birth_precision_invalid: '生辰精度无效，请重新选择。',
  natal_inputs_calculation_sex_invalid: '排盘性别无效，请重新选择。',
  natal_inputs_cultural_marker_invalid: '文化标记无效。',

  // person meta
  person_display_name_empty: '请填写人物的称呼。',
  person_id_empty: '人物标识缺失，请点「重置」后重试。',
  person_consent_state_invalid: '同意状态无效，请重新选择。',
  person_duplicate_id: '该人物已存在，请点「重置」后重试。',
};

export function describeNatalError(code: string): string {
  return MESSAGES[code] ?? `操作未成功（${code}）`;
}
