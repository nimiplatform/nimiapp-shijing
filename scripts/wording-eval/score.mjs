// 措辞评测基线打分器（dev-only）。
//
// 用途：读取 run.mjs 产出的 prompts/*.json，计算模板化指标并写出
// report.json + report.md：
//   template_overlap  final_output 各文本字段 vs deterministic_output 同名字段的
//                     中文字符 3-gram containment（|A∩B|/min(|A|,|B|)），含逐字相等标记
//   coverage          worded 字段数 / 总字段数（内容 ≠ deterministic 同名字段即 worded）
//   empty_patch       patch 存在但不含任何措辞字段的场景比例
//   cross_concern     同一 reading 内不同 concern projection summary 两两 containment 均值
//   cross_date        yuejing-series 相邻日期同 concern cell summary 的 containment
//   twin_diff         1 − containment(rijing-twinA 全部文本, rijing-twinB 全部文本)
//   prompt_bytes      各场景 prompt 字节统计
//   followup evidence shijing-followup 的 user prompt 是否含历史 turn / 前一轮问题
//
// 用法：
//   node scripts/wording-eval/score.mjs [--dir <baseline-dir>]
// 默认 dir = .nimi/local/wording-eval-baseline-2026-08-29/

import console from 'node:console';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const DEFAULT_DIR = '.nimi/local/wording-eval-baseline-2026-08-29';
const NGRAM = 3;

const MODE_SEMANTICS = {
  capture: '仅 prompt 基线：final≈deterministic（summary 等少数字段被占位 patch 替换），overlap/coverage 描述确定性模板自身形态',
  'mock-floor': '模板地板：空 patch，final=纯确定性模板带 AI provenance，预期 template_overlap≈1.0',
  live: '真实模型指标：--generator 注入的模型产出 wording patch',
  unknown: '未知模式（manifest.json 缺失）',
};

function parseArgs(argv) {
  const args = { dir: DEFAULT_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') {
      args.dir = argv[i + 1];
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/wording-eval/score.mjs [--dir <baseline-dir>]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

// --- 相似度：中文字符 3-gram 集合 containment = |A∩B| / min(|A|,|B|)，0..1 ---
function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, '');
}

function ngramSet(text) {
  const clean = normalizeText(text);
  const set = new Set();
  if (clean.length === 0) return set;
  if (clean.length < NGRAM) {
    set.add(clean);
    return set;
  }
  for (let i = 0; i + NGRAM <= clean.length; i += 1) {
    set.add(clean.slice(i, i + NGRAM));
  }
  return set;
}

function containment(aText, bText) {
  const a = ngramSet(aText);
  const b = ngramSet(bText);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection += 1;
  }
  return intersection / Math.min(a.size, b.size);
}

function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round4(value) {
  return value === null ? null : Math.round(value * 10000) / 10000;
}

// --- 字段遍历：final vs deterministic 同名文本字段 ---
function extractFieldPairs(mirrorKind, det, final) {
  const pairs = [];
  const push = (field, d, f) => pairs.push({ field, deterministic: d ?? '', final: f ?? '' });
  if (!det || !final) return pairs;
  if (mirrorKind === 'rijing') {
    push('summary', det.summary, final.summary);
    push('daily_overview', det.daily_overview, final.daily_overview);
    (det.concern_projections ?? []).forEach((projection, i) => {
      const fp = (final.concern_projections ?? [])[i] ?? {};
      push(`concern_projections[${projection.concern_tag_ref}].summary`, projection.summary, fp.summary);
      push(
        `concern_projections[${projection.concern_tag_ref}].recommendations`,
        (projection.recommendations ?? []).join('\n'),
        (fp.recommendations ?? []).join('\n'),
      );
    });
  } else if (mirrorKind === 'yuejing') {
    push('summary', det.summary, final.summary);
    (det.cells ?? []).forEach((cell, i) => {
      const fc = (final.cells ?? [])[i] ?? {};
      push(`cells[${cell.date}#${cell.concern_tag_ref}].summary`, cell.summary, fc.summary);
    });
  } else if (mirrorKind === 'nianjing') {
    push('summary', det.summary, final.summary);
    (det.phase_bands ?? []).forEach((band, i) => {
      const fb = (final.phase_bands ?? [])[i] ?? {};
      push(
        `phase_bands[${band.concern_tag_ref}@${band.start_date}~${band.end_date}].summary`,
        band.summary,
        fb.summary,
      );
    });
    (det.inflection_points ?? []).forEach((point, i) => {
      const fp = (final.inflection_points ?? [])[i] ?? {};
      push(
        `inflection_points[${point.concern_tag_ref}@${point.date}].summary`,
        point.summary,
        fp.summary,
      );
    });
  } else if (mirrorKind === 'mingjing') {
    push('summary', det.summary, final.summary);
    for (const key of [
      'personality',
      'strengths',
      'long_term_themes',
      'relationship_pattern',
      'career_inclination',
    ]) {
      push(`core.${key}`, det.core?.[key], final.core?.[key]);
    }
    (det.life_stage_strategies ?? []).forEach((strategy, i) => {
      const fs = (final.life_stage_strategies ?? [])[i] ?? {};
      push(`life_stage_strategies[${strategy.phase_label}].theme`, strategy.theme, fs.theme);
      push(`life_stage_strategies[${strategy.phase_label}].strategy`, strategy.strategy, fs.strategy);
    });
  } else if (mirrorKind === 'shijing') {
    push('summary', det.summary, final.summary);
    push('answer', det.answer, final.answer);
  }
  return pairs;
}

const WORDING_PATCH_META_KEYS = new Set(['patch_kind', 'mirror_kind']);

function isEmptyPatch(patch) {
  if (!patch || typeof patch !== 'object') return false;
  return Object.keys(patch).every((key) => WORDING_PATCH_META_KEYS.has(key));
}

function pairwiseContainmentMean(texts) {
  const values = [];
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      values.push(containment(texts[i], texts[j]));
    }
  }
  return round4(mean(values));
}

// 同一 reading 内不同关注项的两两重复度（rijing projections / yuejing 当日 cells /
// nianjing phase bands 与 inflection points）。
function crossConcern(record, output) {
  if (!output) return null;
  if (record.mirror_kind === 'rijing') {
    return pairwiseContainmentMean(
      (output.concern_projections ?? []).map((projection) => projection.summary),
    );
  }
  if (record.mirror_kind === 'yuejing') {
    return pairwiseContainmentMean((output.cells ?? []).map((cell) => cell.summary));
  }
  if (record.mirror_kind === 'nianjing') {
    return {
      phase_bands: pairwiseContainmentMean(
        (output.phase_bands ?? []).map((band) => band.summary),
      ),
      inflection_points: pairwiseContainmentMean(
        (output.inflection_points ?? []).map((point) => point.summary),
      ),
    };
  }
  return null;
}

function scoreScenario(record) {
  const scored = {
    scenario: record.scenario,
    persona: record.persona,
    mirror_kind: record.mirror_kind,
    // shijing-followup 这类无 final_output 的捕获场景以 failure 缺失判定 ok。
    ok: !record.failure,
    prompt_bytes: record.prompt_bytes ?? null,
  };
  if (record.failure) scored.failure = record.failure;
  if (record.patch !== undefined) scored.empty_patch = isEmptyPatch(record.patch);
  if (!record.final_output || !record.deterministic_output) return scored;

  const pairs = extractFieldPairs(record.mirror_kind, record.deterministic_output, record.final_output);
  const fields = pairs.map((pair) => ({
    field: pair.field,
    containment: round4(containment(pair.deterministic, pair.final)),
    identical: normalizeText(pair.deterministic) === normalizeText(pair.final),
    deterministic_chars: normalizeText(pair.deterministic).length,
    final_chars: normalizeText(pair.final).length,
  }));
  scored.fields = fields;
  scored.field_count = fields.length;
  scored.worded_fields = fields.filter((field) => !field.identical).length;
  scored.coverage = fields.length > 0 ? round4(scored.worded_fields / fields.length) : null;
  scored.template_overlap = round4(mean(fields.map((field) => field.containment)));
  scored.cross_concern = crossConcern(record, record.final_output);
  return scored;
}

// yuejing-series：相邻日期 reading 的同 concern focus cell summary containment。
function crossDate(recordsByScenario) {
  const series = [...recordsByScenario.values()]
    .filter((record) => record.scenario.startsWith('yuejing-series-') && record.final_output)
    .sort((a, b) =>
      String(a.mirror_scope?.start_date ?? '').localeCompare(String(b.mirror_scope?.start_date ?? '')),
    );
  const pairs = [];
  for (let i = 0; i + 1 < series.length; i += 1) {
    const current = series[i];
    const next = series[i + 1];
    const nextByConcern = new Map(
      (next.final_output.cells ?? []).map((cell) => [cell.concern_tag_ref, cell.summary]),
    );
    for (const cell of current.final_output.cells ?? []) {
      const nextSummary = nextByConcern.get(cell.concern_tag_ref);
      if (nextSummary === undefined) continue;
      pairs.push({
        from: current.mirror_scope.start_date,
        to: next.mirror_scope.start_date,
        concern_tag_ref: cell.concern_tag_ref,
        containment: round4(containment(cell.summary, nextSummary)),
      });
    }
  }
  return {
    pairs,
    mean: round4(mean(pairs.map((pair) => pair.containment))),
  };
}

function allFieldText(record) {
  const output = record.final_output ?? record.deterministic_output;
  if (!output) return '';
  return extractFieldPairs(record.mirror_kind, output, output)
    .map((pair) => pair.deterministic)
    .join('\n');
}

// twin_diff：同命盘不同关注原文的区分度。1 = 完全不同，0 = 完全一致。
function twinDiff(recordsByScenario) {
  const twinA = recordsByScenario.get('rijing-twinA');
  const twinB = recordsByScenario.get('rijing-twinB');
  if (!twinA || !twinB) return null;
  const promptsIdentical =
    twinA.system_prompt === twinB.system_prompt && twinA.user_prompt === twinB.user_prompt;
  return {
    twin_diff: round4(1 - containment(allFieldText(twinA), allFieldText(twinB))),
    prompts_identical: promptsIdentical,
    note: promptsIdentical
      ? '基于 final_output（缺失时回退 deterministic_output）全部文本字段拼接。两个关注原文不同的 persona 仍产生相同 prompt，表明关注措辞上下文未进入生产请求。'
      : '基于 final_output（缺失时回退 deterministic_output）全部文本字段拼接。生产级 prompt 已按 concern id 携带各自的 prompt_text；capture/mock-floor 不使用真实模型，因此文案区分度仅在 live 模式具有产品意义。',
  };
}

// shijing-followup evidence：证明 user prompt 同时包含引用解读、已有
// conversation_history 与当前 user_message。
function followupEvidence(record) {
  if (!record?.user_prompt) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(record.user_prompt);
  } catch {
    parsed = null;
  }
  const referenceReadings = Array.isArray(parsed?.reference_readings)
    ? parsed.reference_readings
    : [];
  return {
    source: 'src/product/conversations/conversation-chat-bridge.ts',
    top_level_keys: parsed ? Object.keys(parsed).sort() : [],
    reference_reading_count: referenceReadings.length,
    reference_reading_keys: referenceReadings[0] ? Object.keys(referenceReadings[0]).sort() : [],
    contains_history_turns: Array.isArray(parsed?.conversation_history)
      && parsed.conversation_history.length > 0,
    contains_prior_consultation_question: record.user_prompt.includes(
      '未来三个月我在事业转型和照顾母亲之间该怎么取舍',
    ),
    note: '追问 user prompt 携带每份 source reading 的 output_summary + mirror_scope + uncertainty、已有 conversation_history 与当前 user_message；历史对话只用于承接语义，不替代引用 Reading 成为占星依据。',
  };
}

function promptBytesStats(scoredList) {
  const totals = scoredList
    .map((scored) => scored.prompt_bytes?.total ?? 0)
    .filter((total) => total > 0);
  const byKind = {};
  for (const scored of scoredList) {
    if (!scored.prompt_bytes) continue;
    byKind[scored.mirror_kind] = (byKind[scored.mirror_kind] ?? 0) + scored.prompt_bytes.total;
  }
  return {
    total: totals.reduce((sum, v) => sum + v, 0),
    min: totals.length > 0 ? Math.min(...totals) : null,
    max: totals.length > 0 ? Math.max(...totals) : null,
    mean: totals.length > 0 ? Math.round(mean(totals)) : null,
    by_mirror_kind: byKind,
  };
}

function formatCell(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildReportMarkdown({ mode, dir, aggregate, scoredList, seriesCrossDate, twins, evidence }) {
  const lines = [];
  lines.push('# 措辞评测基线报告');
  lines.push('');
  lines.push(`- 目录: \`${dir}\``);
  lines.push(`- 模式: \`${mode}\` — ${MODE_SEMANTICS[mode] ?? MODE_SEMANTICS.unknown}`);
  lines.push('- 相似度: 中文字符 3-gram 集合 containment = |A∩B| / min(|A|,|B|)');
  lines.push('');
  lines.push('## 模式语义');
  lines.push('');
  lines.push(`- capture: ${MODE_SEMANTICS.capture}`);
  lines.push(`- mock-floor: ${MODE_SEMANTICS['mock-floor']}`);
  lines.push(`- live: ${MODE_SEMANTICS.live}`);
  lines.push('');
  lines.push('## 场景汇总');
  lines.push('');
  lines.push(
    '| scenario | persona | kind | ok | fields | worded | coverage | template_overlap | cross_concern | prompt_bytes |',
  );
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const scored of scoredList) {
    lines.push(
      `| ${scored.scenario} | ${scored.persona} | ${scored.mirror_kind} | ${scored.ok ? 'ok' : 'FAIL'} | ` +
        `${formatCell(scored.field_count)} | ${formatCell(scored.worded_fields)} | ` +
        `${formatCell(scored.coverage)} | ${formatCell(scored.template_overlap)} | ` +
        `${formatCell(scored.cross_concern)} | ${formatCell(scored.prompt_bytes?.total)} |`,
    );
  }
  lines.push('');
  lines.push('## 聚合指标');
  lines.push('');
  lines.push(`- template_overlap 均值: ${formatCell(aggregate.template_overlap_mean)}`);
  lines.push(`- coverage 均值: ${formatCell(aggregate.coverage_mean)}`);
  lines.push(`- empty_patch 比例: ${formatCell(aggregate.empty_patch_ratio)} (${aggregate.empty_patch_count}/${aggregate.patched_count})`);
  lines.push(`- 失败场景数: ${aggregate.failure_count}`);
  lines.push(
    `- prompt_bytes: total=${aggregate.prompt_bytes.total} mean=${aggregate.prompt_bytes.mean} ` +
      `min=${aggregate.prompt_bytes.min} max=${aggregate.prompt_bytes.max}`,
  );
  lines.push('');
  lines.push('## cross_date（yuejing-series 相邻日期同 concern cell）');
  lines.push('');
  lines.push(`- 均值: ${formatCell(seriesCrossDate.mean)}`);
  if (seriesCrossDate.pairs.length > 0) {
    lines.push('');
    lines.push('| from | to | concern | containment |');
    lines.push('|---|---|---|---|');
    for (const pair of seriesCrossDate.pairs) {
      lines.push(`| ${pair.from} | ${pair.to} | ${pair.concern_tag_ref} | ${pair.containment} |`);
    }
  }
  lines.push('');
  lines.push('## twin_diff（同命盘不同关注原文区分度）');
  lines.push('');
  if (twins) {
    lines.push(`- rijing twinA vs twinB: ${twins.twin_diff}（1=完全不同，0=完全一致）`);
    lines.push(`- 两侧生产级 prompt 逐字节相同: ${twins.prompts_identical}`);
    lines.push(`- 说明: ${twins.note}`);
  } else {
    lines.push('- twin 场景缺失');
  }
  lines.push('');
  lines.push('## shijing-followup 证据（追问 prompt 承接历史 turn）');
  lines.push('');
  if (evidence) {
    lines.push(`- 来源: \`${evidence.source}\``);
    lines.push(`- user prompt 顶层键: ${evidence.top_level_keys.join(', ')}`);
    lines.push(`- reference_readings 条数: ${evidence.reference_reading_count}，条目键: ${evidence.reference_reading_keys.join(', ')}`);
    lines.push(`- 含历史 turn 字段: ${evidence.contains_history_turns}`);
    lines.push(`- 含上一轮咨询问题原文: ${evidence.contains_prior_consultation_question}`);
    lines.push(`- 说明: ${evidence.note}`);
  } else {
    lines.push('- shijing-followup 场景缺失或无 user prompt');
  }
  const failed = scoredList.filter((scored) => scored.failure);
  if (failed.length > 0) {
    lines.push('');
    lines.push('## 失败场景');
    lines.push('');
    for (const scored of failed) {
      lines.push(`- ${scored.scenario}: \`${JSON.stringify(scored.failure)}\``);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = resolve(args.dir);
  const promptsDir = join(dir, 'prompts');
  if (!existsSync(promptsDir)) {
    throw new Error(`prompts directory not found: ${promptsDir} (run scripts/wording-eval/run.mjs first)`);
  }

  const manifestPath = join(dir, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : null;
  const mode = manifest?.mode ?? 'unknown';

  const recordsByScenario = new Map();
  for (const file of readdirSync(promptsDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const record = JSON.parse(readFileSync(join(promptsDir, file), 'utf8'));
    recordsByScenario.set(record.scenario, record);
  }

  const scoredList = [...recordsByScenario.values()].map(scoreScenario);
  const scoredWithFields = scoredList.filter((scored) => scored.field_count > 0);
  const patched = scoredList.filter((scored) => scored.empty_patch !== undefined);
  const seriesCrossDate = crossDate(recordsByScenario);
  const twins = twinDiff(recordsByScenario);
  const evidence = followupEvidence(recordsByScenario.get('shijing-followup'));

  const aggregate = {
    template_overlap_mean: round4(mean(scoredWithFields.map((scored) => scored.template_overlap))),
    coverage_mean: round4(mean(scoredWithFields.map((scored) => scored.coverage))),
    patched_count: patched.length,
    empty_patch_count: patched.filter((scored) => scored.empty_patch).length,
    empty_patch_ratio:
      patched.length > 0
        ? round4(patched.filter((scored) => scored.empty_patch).length / patched.length)
        : null,
    failure_count: scoredList.filter((scored) => scored.failure).length,
    prompt_bytes: promptBytesStats(scoredList),
  };

  const report = {
    dir: args.dir,
    mode,
    generated_at: new Date().toISOString(),
    metric: `chinese char ${NGRAM}-gram set containment |A∩B|/min(|A|,|B|)`,
    aggregate,
    scenarios: scoredList,
    cross_date: seriesCrossDate,
    twin_diff: twins,
    followup_evidence: evidence,
  };
  writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(
    join(dir, 'report.md'),
    buildReportMarkdown({ mode, dir: args.dir, aggregate, scoredList, seriesCrossDate, twins, evidence }),
  );

  console.log(`[wording-eval:score] mode=${mode} scenarios=${scoredList.length} dir=${args.dir}`);
  console.log(`  template_overlap_mean=${aggregate.template_overlap_mean} coverage_mean=${aggregate.coverage_mean}`);
  console.log(`  empty_patch_ratio=${aggregate.empty_patch_ratio} failures=${aggregate.failure_count}`);
  console.log(`  cross_date_mean=${seriesCrossDate.mean} twin_diff=${twins?.twin_diff ?? '-'}`);
}

main();
