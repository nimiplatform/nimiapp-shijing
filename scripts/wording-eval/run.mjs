// 措辞评测基线 harness（dev-only）。
//
// 用途：用固定 persona 假数据跑真实生产管线 generateReading，在 RuntimeAiClient
// 边界捕获生产级 prompt（system/user）与确定性输出，再按模式让管线走完：
//   capture    （默认）只捕获 prompt 基线；返回合法最小 patch（summary 占位，
//              mingjing natal 额外补 core 五字段与阶段 theme/strategy，否则
//              validateMirrorOutput 因确定性骨架空字段 fail-close）。
//   mock-floor 返回空 patch（仅 patch_kind + mirror_kind），输出 = 纯确定性模板
//              但带 AI provenance —— 即要量化的「伪个性化地板」，预期
//              template_overlap ≈ 1.0。注意：mingjing natal 的确定性骨架按设计
//              不含叙事字段，空 patch 会被 fail-close，失败详情写入 manifest。
//   live       通过 --generator 注入真实模型（模块需导出
//              `export async function generate({ system, user, mirrorKind }) => string`），
//              复刻 src/shell/ai/shijing-runtime-ai.ts 的 applyRuntimeAiWordingText 链路。
//
// 用法：
//   node scripts/wording-eval/run.mjs [--mode capture|mock-floor|live] \
//     [--generator <module.mjs>] [--out <dir>]
// 默认 out = .nimi/local/wording-eval-baseline-2026-08-29/（已 gitignore）。
//
// 复现锚点：date=2026-06-15，created_at=2026-06-15T02:00:00Z，
// now=2026-06-15T03:00:00Z（必须传 now，否则 inputsSummary freshness 可能
// fail-close）。评测 reading 使用可读固定 id 而非 ULID —— 它们只落盘到评测
// JSON、从不进入应用持久层，固定 id 保证基线可 diff。
//
// 输出：每个场景一个 <out>/prompts/<scenario>.json，外加 manifest.json 汇总。

import { Buffer } from 'node:buffer';
import console from 'node:console';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { generateReading } from '../../src/product/astrology/generate-reading.ts';
import { runtimeAiWordingPatchAppliedSource } from '../../src/product/astrology/runtime-ai-client.ts';
import {
  applyRuntimeAiWordingPatch,
  RUNTIME_AI_WORDING_PATCH_KIND,
  validateRuntimeAiWordingPatchValue,
} from '../../src/product/astrology/runtime-ai-wording-patch.ts';
import { applyRuntimeAiWordingText } from '../../src/product/astrology/runtime-ai-wording-text.ts';
import { createConversationChatBridge } from '../../src/product/conversations/conversation-chat-bridge.ts';
import {
  consultationMirrorScope,
  dailyMirrorScope,
  longHorizonMirrorScope,
  natalMirrorScope,
  rolling30DayMirrorScope,
} from '../../test/_fixtures.mjs';
import { buildPersonaSpace } from './personas.mjs';

const ANCHOR_DATE = '2026-06-15';
const CREATED_AT = '2026-06-15T02:00:00Z';
const NOW = new Date('2026-06-15T03:00:00Z');
const TZ = 'Asia/Shanghai';
const DEFAULT_OUT = '.nimi/local/wording-eval-baseline-2026-08-29';

const CONSULTATION_QUESTION = '未来三个月我在事业转型和照顾母亲之间该怎么取舍？';
const FOLLOWUP_MESSAGE = '那我下个月 20 号之前答复主管，时间上合适吗？';

const MODES = ['capture', 'mock-floor', 'live'];

function usage() {
  return [
    'Usage: node scripts/wording-eval/run.mjs [--mode capture|mock-floor|live]',
    '           [--generator <module.mjs>] [--out <dir>]',
    `  --mode        evaluation mode (default: capture), one of: ${MODES.join(', ')}`,
    '  --generator   live-mode text generator module exporting async generate()',
    '  --out         output directory (default: ' + DEFAULT_OUT + ')',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { mode: 'capture', generator: null, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') {
      args.mode = argv[i + 1];
      i += 1;
    } else if (arg === '--generator') {
      args.generator = argv[i + 1];
      i += 1;
    } else if (arg === '--out') {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}\n${usage()}`);
    }
  }
  if (!MODES.includes(args.mode)) {
    throw new Error(`invalid --mode "${args.mode}"; expected one of: ${MODES.join(', ')}`);
  }
  if (args.mode === 'live' && !args.generator) {
    throw new Error('--mode live requires --generator <module.mjs> (default mode only captures)');
  }
  return args;
}

async function loadLiveGenerator(modulePath) {
  const mod = await import(pathToFileURL(resolve(modulePath)).href);
  if (typeof mod.generate !== 'function') {
    throw new Error(
      `generator module ${modulePath} must export async function generate({ system, user, mirrorKind })`,
    );
  }
  return mod;
}

function plusDays(dateText, days) {
  const d = new Date(`${dateText}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function promptBytes(request) {
  if (!request) return null;
  const system = Buffer.byteLength(request.system_prompt, 'utf8');
  const user = Buffer.byteLength(request.user_prompt, 'utf8');
  return { system, user, total: system + user };
}

// capture 模式的最小合法 patch：summary 占位即可通过各 kind 校验；
// mingjing natal 的确定性骨架 core 五字段与阶段 theme/strategy 为空串
// （见 mingjing-reading-generator.ts），validateMirrorOutput 要求非空，
// 必须补齐才能让管线走完（参考 validate-mingjing-patches.ts）。
function minimalCapturePatch(mirrorKind, deterministicOutput) {
  const patch = {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: mirrorKind,
    summary: '评测占位',
  };
  if (mirrorKind === 'mingjing') {
    patch.core = {
      personality: '评测占位性格底色',
      strengths: '评测占位优势能力',
      long_term_themes: '评测占位长期课题',
      relationship_pattern: '评测占位关系模式',
      career_inclination: '评测占位事业倾向',
    };
    patch.life_stage_strategies = (deterministicOutput.life_stage_strategies ?? []).map((s) => ({
      phase_label: s.phase_label,
      theme: '评测占位阶段主题',
      strategy: '评测占位阶段策略',
    }));
  }
  return patch;
}

// 参照 test/_mock-runtime-ai-client.mjs 的 canned_patch 模式：校验 → apply →
// 带 provenance 返回；失败映射为 typed parse_failure，绝不伪造输出。
function createEvalRuntimeAiClient({ mode, liveGenerator, onCapture }) {
  return {
    async generate(mirrorKind, request) {
      const captured = { mirror_kind: mirrorKind, request };
      if (mode === 'live') {
        let text;
        try {
          text = await liveGenerator.generate({
            system: request.system_prompt,
            user: request.user_prompt,
            mirrorKind,
          });
        } catch (error) {
          const failure = {
            kind: 'runtime_unavailable',
            detail: error instanceof Error ? error.message : String(error),
          };
          onCapture({ ...captured, failure });
          return { ok: false, failure };
        }
        const result = applyRuntimeAiWordingText(mirrorKind, request, text);
        onCapture({ ...captured, raw_response: text, result });
        return result;
      }
      const patch =
        mode === 'mock-floor'
          ? { patch_kind: RUNTIME_AI_WORDING_PATCH_KIND, mirror_kind: mirrorKind }
          : minimalCapturePatch(mirrorKind, request.deterministic_output);
      try {
        const validated = validateRuntimeAiWordingPatchValue(mirrorKind, patch);
        const output = applyRuntimeAiWordingPatch(request.deterministic_output, validated);
        onCapture({ ...captured, patch: validated });
        return { ok: true, output, output_source: runtimeAiWordingPatchAppliedSource() };
      } catch (error) {
        const failure = {
          kind: 'parse_failure',
          failure: {
            kind: 'validation_failed',
            detail: error instanceof Error ? error.message : String(error),
          },
        };
        onCapture({ ...captured, patch, failure });
        return { ok: false, failure };
      }
    },
  };
}

function scenarioDefinitions() {
  const defs = [];
  for (const persona of ['rich', 'eventsOnly', 'plansOnly', 'customOnly', 'bare', 'twinA', 'twinB']) {
    defs.push({
      scenario: `rijing-${persona}`,
      persona,
      mirrorKind: 'rijing',
      scope: dailyMirrorScope({ date: ANCHOR_DATE, basis_time_zone: TZ }),
    });
  }
  for (const persona of ['rich', 'customOnly', 'bare']) {
    defs.push({
      scenario: `yuejing-${persona}`,
      persona,
      mirrorKind: 'yuejing',
      scope: rolling30DayMirrorScope({
        start_date: ANCHOR_DATE,
        end_date: plusDays(ANCHOR_DATE, 29),
        basis_time_zone: TZ,
      }),
    });
  }
  for (let i = 0; i < 5; i += 1) {
    const start = plusDays(ANCHOR_DATE, i);
    defs.push({
      scenario: `yuejing-series-rich-${start}`,
      persona: 'rich',
      mirrorKind: 'yuejing',
      scope: rolling30DayMirrorScope({
        start_date: start,
        end_date: plusDays(start, 29),
        basis_time_zone: TZ,
      }),
    });
  }
  for (const persona of ['rich', 'customOnly', 'bare']) {
    defs.push({
      scenario: `nianjing-${persona}`,
      persona,
      mirrorKind: 'nianjing',
      scope: longHorizonMirrorScope({
        start_date: '2026-01-01',
        end_date: '2027-12-31',
        basis_time_zone: TZ,
      }),
      // 年镜权威：默认不含 PlanItem —— cited_plan_item_refs 传 []，事件可传。
      citedPlanItemRefs: [],
    });
  }
  for (const persona of ['rich', 'bare']) {
    defs.push({
      scenario: `mingjing-${persona}`,
      persona,
      mirrorKind: 'mingjing',
      scope: natalMirrorScope({ anchor_year: 2026, basis_time_zone: TZ }),
      concernTagRefs: [],
      citedPlanItemRefs: [],
    });
  }
  return defs;
}

function buildRecord(def, captured, result) {
  const request = captured?.request ?? null;
  const record = {
    scenario: def.scenario,
    persona: def.persona,
    mirror_kind: def.mirrorKind,
    mirror_scope: def.scope,
    system_prompt: request?.system_prompt ?? null,
    user_prompt: request?.user_prompt ?? null,
    deterministic_output: request?.deterministic_output ?? null,
    prompt_bytes: promptBytes(request),
  };
  if (captured?.patch) record.patch = captured.patch;
  if (captured?.raw_response !== undefined) record.raw_response = captured.raw_response;
  if (result.ok) {
    record.final_output = result.reading.output;
  } else {
    record.failure = result.failure;
  }
  return record;
}

async function runGenerateScenario(ctx, def) {
  const persona = buildPersonaSpace(def.persona);
  const space = def.decorateSpace ? def.decorateSpace(persona.space) : persona.space;
  let captured = null;
  const client = createEvalRuntimeAiClient({
    mode: ctx.mode,
    liveGenerator: ctx.liveGenerator,
    onCapture: (c) => {
      captured = c;
    },
  });
  const result = await generateReading(
    {
      id: `eval_${def.scenario}`,
      created_at: CREATED_AT,
      mirror_kind: def.mirrorKind,
      mirror_scope: def.scope,
      related_person_refs: [],
      concern_tag_refs: def.concernTagRefs ?? persona.concernTagRefs,
      cited_reading_ids: def.citedReadingIds ?? [],
      cited_event_memory_refs: def.citedEventMemoryRefs ?? persona.eventMemoryRefs,
      cited_plan_item_refs: def.citedPlanItemRefs ?? persona.planItemRefs,
      space,
      ...(def.question ? { question: def.question } : {}),
    },
    { runtime_ai_client: client, now: NOW },
  );
  return buildRecord(def, captured, result);
}

// 问镜 consultation：先用同一模式的 client 给 rich space 生成 rijing + yuejing +
// nianjing 三份 source readings 并 push 进 space.readings，再跑 consultation scope。
async function runShijingConsultationScenario(ctx) {
  const def = {
    scenario: 'shijing-rich',
    persona: 'rich',
    mirrorKind: 'shijing',
    question: CONSULTATION_QUESTION,
  };
  const persona = buildPersonaSpace('rich');
  const sourceDefs = [
    {
      key: 'rijing',
      scope: dailyMirrorScope({ date: ANCHOR_DATE, basis_time_zone: TZ }),
      citedPlanItemRefs: persona.planItemRefs,
    },
    {
      key: 'yuejing',
      scope: rolling30DayMirrorScope({
        start_date: ANCHOR_DATE,
        end_date: plusDays(ANCHOR_DATE, 29),
        basis_time_zone: TZ,
      }),
      citedPlanItemRefs: persona.planItemRefs,
    },
    {
      key: 'nianjing',
      scope: longHorizonMirrorScope({
        start_date: '2026-01-01',
        end_date: '2027-12-31',
        basis_time_zone: TZ,
      }),
      citedPlanItemRefs: [],
    },
  ];
  const sourceReadings = [];
  for (const sourceDef of sourceDefs) {
    const client = createEvalRuntimeAiClient({
      mode: ctx.mode,
      liveGenerator: ctx.liveGenerator,
      onCapture: () => {},
    });
    const result = await generateReading(
      {
        id: `eval_shijing_source_${sourceDef.key}`,
        created_at: CREATED_AT,
        mirror_kind: sourceDef.key,
        mirror_scope: sourceDef.scope,
        related_person_refs: [],
        concern_tag_refs: persona.concernTagRefs,
        cited_reading_ids: [],
        cited_event_memory_refs: persona.eventMemoryRefs,
        cited_plan_item_refs: sourceDef.citedPlanItemRefs,
        space: persona.space,
      },
      { runtime_ai_client: client, now: NOW },
    );
    if (!result.ok) {
      return {
        record: {
          scenario: def.scenario,
          persona: def.persona,
          mirror_kind: def.mirrorKind,
          question: def.question,
          mirror_scope: null,
          system_prompt: null,
          user_prompt: null,
          deterministic_output: null,
          prompt_bytes: null,
          failure: {
            kind: 'source_reading_generation_failed',
            source_mirror_kind: sourceDef.key,
            detail: result.failure,
          },
        },
        sourceReadings: null,
      };
    }
    sourceReadings.push(result.reading);
  }
  const sourceIds = sourceReadings.map((reading) => reading.id);
  const scope = consultationMirrorScope(sourceIds, { basis_time_zone: TZ });
  const record = await runGenerateScenario(ctx, {
    ...def,
    scope,
    citedReadingIds: sourceIds,
    decorateSpace: (space) => ({ ...space, readings: sourceReadings }),
  });
  return { record, sourceReadings };
}

// 问镜追问：conversation-chat-bridge + 捕获 generator。user prompt 必须同时
// 携带每份 source reading 的 output_summary + mirror_scope + uncertainty、
// 已有 conversation turns 和当前 user_message；score.mjs 将对这个合同产生证据。
async function runFollowupScenario(ctx, sourceReadings) {
  const def = {
    scenario: 'shijing-followup',
    persona: 'rich',
    mirrorKind: 'shijing',
    scope: null,
  };
  if (!sourceReadings) {
    return {
      scenario: def.scenario,
      persona: def.persona,
      mirror_kind: def.mirrorKind,
      mirror_scope: null,
      system_prompt: null,
      user_prompt: null,
      deterministic_output: null,
      prompt_bytes: null,
      failure: {
        kind: 'source_readings_unavailable',
        detail: 'shijing consultation source readings failed; follow-up skipped',
      },
    };
  }
  let capturedRequest = null;
  let rawResponse;
  const generator = async (request) => {
    capturedRequest = request;
    if (ctx.mode === 'live') {
      const text = await ctx.liveGenerator.generate({
        system: request.system,
        user: request.user,
        mirrorKind: 'shijing',
      });
      rawResponse = text;
      return { text };
    }
    return { text: '评测占位回复' };
  };
  const bridge = createConversationChatBridge({ generator, now: () => NOW });
  const sendResult = await bridge.send({
    user_message: FOLLOWUP_MESSAGE,
    source_readings: sourceReadings,
    conversation_turns: [
      {
        id: 'eval_followup_prior_user',
        role: 'user',
        body: CONSULTATION_QUESTION,
        cited_reading_ids: [],
        cited_event_memory_refs: [],
        cited_plan_item_refs: [],
        created_at: CREATED_AT,
      },
      {
        id: 'eval_followup_prior_ai',
        role: 'ai',
        body: '先对照引用解读梳理事业转型与照护安排的先后顺序。',
        cited_reading_ids: sourceReadings.map((reading) => reading.id),
        cited_event_memory_refs: [],
        cited_plan_item_refs: [],
        created_at: CREATED_AT,
      },
    ],
  });
  const record = {
    scenario: def.scenario,
    persona: def.persona,
    mirror_kind: def.mirrorKind,
    mirror_scope: null,
    system_prompt: capturedRequest?.system ?? null,
    user_prompt: capturedRequest?.user ?? null,
    deterministic_output: null,
    prompt_bytes: capturedRequest
      ? promptBytes({ system_prompt: capturedRequest.system, user_prompt: capturedRequest.user })
      : null,
    question: FOLLOWUP_MESSAGE,
  };
  if (rawResponse !== undefined) record.raw_response = rawResponse;
  if (sendResult.ok) {
    record.followup_response = sendResult.text;
  } else {
    record.failure = sendResult.error;
  }
  return record;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const liveGenerator = args.generator ? await loadLiveGenerator(args.generator) : null;
  const ctx = { mode: args.mode, liveGenerator };

  const outDir = resolve(args.out);
  const promptsDir = join(outDir, 'prompts');
  mkdirSync(promptsDir, { recursive: true });

  const records = [];
  for (const def of scenarioDefinitions()) {
    records.push(await runGenerateScenario(ctx, def));
  }
  const consultation = await runShijingConsultationScenario(ctx);
  records.push(consultation.record);
  records.push(await runFollowupScenario(ctx, consultation.sourceReadings));

  for (const record of records) {
    writeFileSync(
      join(promptsDir, `${record.scenario}.json`),
      JSON.stringify(record, null, 2) + '\n',
    );
  }

  const failures = records.filter((record) => record.failure);
  const manifest = {
    tool: 'scripts/wording-eval/run.mjs',
    mode: args.mode,
    generated_at: new Date().toISOString(),
    anchor: {
      date: ANCHOR_DATE,
      created_at: CREATED_AT,
      now: NOW.toISOString(),
      basis_time_zone: TZ,
    },
    out_dir: args.out,
    scenario_count: records.length,
    failure_count: failures.length,
    scenarios: records.map((record) => ({
      scenario: record.scenario,
      persona: record.persona,
      mirror_kind: record.mirror_kind,
      file: `prompts/${record.scenario}.json`,
      ok: !record.failure,
      ...(record.failure ? { failure: record.failure } : {}),
      prompt_bytes: record.prompt_bytes,
    })),
    notes: [
      'capture=仅 prompt 基线（summary 等最小占位 patch，final≈deterministic）',
      'mock-floor=模板地板（空 patch，预期 template_overlap≈1.0；mingjing natal 骨架按设计缺叙事字段，空 patch 会 fail-close）',
      'live=真实模型指标（--generator 注入）',
    ],
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(`[wording-eval] mode=${args.mode} scenarios=${records.length} out=${args.out}`);
  for (const record of records) {
    const status = record.failure ? 'FAIL' : 'ok';
    const bytes = record.prompt_bytes ? `${record.prompt_bytes.total}B` : '-';
    console.log(`  ${status.padEnd(4)} ${record.scenario.padEnd(32)} ${bytes}`);
  }
  if (failures.length > 0) {
    console.log(`[wording-eval] ${failures.length} scenario(s) failed (see manifest.json):`);
    for (const record of failures) {
      console.log(`  - ${record.scenario}: ${JSON.stringify(record.failure)}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
