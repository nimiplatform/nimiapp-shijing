type ModelConfigLanguage = 'zh' | 'en';

export const SHIJING_MODEL_CONFIG_COPY_ZH: Readonly<Record<string, string>> = {
  'ModelConfig.profile.sectionTitle': 'AI 配置档案',
  'ModelConfig.profile.summaryLabel': 'AI Profile',
  'ModelConfig.profile.emptySummaryLabel': '未应用 Profile',
  'ModelConfig.profile.applyButtonLabel': '应用 Profile',
  'ModelConfig.profile.changeButtonLabel': '更换',
  'ModelConfig.profile.manageButtonTitle': '管理 AI Profile',
  'ModelConfig.profile.modalTitle': '应用 AI Profile',
  'ModelConfig.profile.modalHint': '应用 Profile 会覆盖当前能力绑定。请确认后再写入。',
  'ModelConfig.profile.loadingLabel': '正在加载 Profile...',
  'ModelConfig.profile.emptyLabel': '暂无可用 Profile。',
  'ModelConfig.profile.currentBadgeLabel': '当前',
  'ModelConfig.profile.cancelLabel': '取消',
  'ModelConfig.profile.confirmLabel': '确认应用',
  'ModelConfig.profile.applyingLabel': '应用中...',
  'ModelConfig.profile.reloadLabel': '重新加载',
  'ModelConfig.profile.importLabel': '导入 AI Profile',
  'ModelConfig.profile.previewTitle': '确认配置变更',
  'ModelConfig.profile.previewHint': '这里展示写入前后的完整 AIConfig 差异。确认前不会保存。',
  'ModelConfig.profile.previewingLabel': '正在计算预览...',
  'ModelConfig.profile.previewFirstApplyLabel': '当前 scope 还没有 AIConfig；应用后会创建配置。',
  'ModelConfig.profile.previewNoChangeLabel': '这个 Profile 与当前配置一致。',
  'ModelConfig.profile.previewBeforeLabel': '当前',
  'ModelConfig.profile.previewAfterLabel': '应用后',
  'ModelConfig.profile.previewWarningsLabel': '警告',
  'ModelConfig.profile.previewConfirmLabel': '确认写入',
  'ModelConfig.profile.previewBackLabel': '返回',
  'ModelConfig.section.chat.title': '文本生成',
  'ModelConfig.capability.textGenerate.title': '时镜解读模型',
  'ModelConfig.capability.textGenerate.subtitle': 'Runtime AI wording',
  'ModelConfig.capability.textGenerate.detail': '为四镜解读绑定 Runtime text.generate 模型。缺少绑定时生成会 fail-close。',
  'ModelConfig.editor.common.timeoutLabel': '超时',
  'ModelConfig.editor.common.defaultPlaceholder': '默认',
  'ModelConfig.editor.common.previewBadgeLabel': '预览',
  'ModelConfig.editor.textGenerate.parametersLabel': '参数',
  'ModelConfig.editor.textGenerate.generationDefaultsLabel': '生成默认值',
  'ModelConfig.editor.textGenerate.responseControlsLabel': '响应控制',
  'ModelConfig.editor.textGenerate.advancedLabel': '高级设置',
  'ModelConfig.editor.textGenerate.temperatureLabel': 'Temperature',
  'ModelConfig.editor.textGenerate.topPLabel': 'Top P',
  'ModelConfig.editor.textGenerate.topKLabel': 'Top K',
  'ModelConfig.editor.textGenerate.maxTokensLabel': 'Max Tokens',
  'ModelConfig.editor.textGenerate.stopSequencesLabel': '停止序列',
  'ModelConfig.editor.textGenerate.stopSequencesHint': '最多 {{max}} 条，每行一条。',
  'ModelConfig.editor.textGenerate.stopSequencesPlaceholder': '输入后回车',
  'ModelConfig.editor.textGenerate.presencePenaltyLabel': 'Presence penalty',
  'ModelConfig.editor.textGenerate.frequencyPenaltyLabel': 'Frequency penalty',
  'ModelConfig.hub.title': 'AI 模型',
  'ModelConfig.hub.backLabel': '返回',
  'ModelConfig.hub.aggregateReady': '{{count}} 项已就绪',
  'ModelConfig.hub.aggregateAttention': '{{count}} 项需要配置',
  'ModelConfig.hub.aggregateNeutral': '{{count}} 项未配置',
  'ModelConfig.hub.aggregateEmpty': '暂无能力配置',
  'ModelConfig.hub.detailTitleFormat': '{{section}}配置',
  'ModelConfig.hub.activeModelLabel': '当前模型',
  'ModelConfig.hub.detailStatusReady': 'Runtime 已就绪',
  'ModelConfig.hub.detailStatusAttention': '需要配置',
  'ModelConfig.hub.detailStatusNeutral': '未配置',
};

export const SHIJING_MODEL_CONFIG_COPY_EN: Readonly<Record<string, string>> = {
  'ModelConfig.profile.sectionTitle': 'AI configuration profile',
  'ModelConfig.profile.summaryLabel': 'AI Profile',
  'ModelConfig.profile.emptySummaryLabel': 'No profile applied',
  'ModelConfig.profile.applyButtonLabel': 'Apply profile',
  'ModelConfig.profile.changeButtonLabel': 'Change',
  'ModelConfig.profile.manageButtonTitle': 'Manage AI profile',
  'ModelConfig.profile.modalTitle': 'Apply AI profile',
  'ModelConfig.profile.modalHint': 'Applying a profile will overwrite current capability bindings. Confirm before writing.',
  'ModelConfig.profile.loadingLabel': 'Loading profiles...',
  'ModelConfig.profile.emptyLabel': 'No available profiles.',
  'ModelConfig.profile.currentBadgeLabel': 'Current',
  'ModelConfig.profile.cancelLabel': 'Cancel',
  'ModelConfig.profile.confirmLabel': 'Apply',
  'ModelConfig.profile.applyingLabel': 'Applying...',
  'ModelConfig.profile.reloadLabel': 'Reload',
  'ModelConfig.profile.importLabel': 'Import AI profile',
  'ModelConfig.profile.previewTitle': 'Confirm configuration change',
  'ModelConfig.profile.previewHint': 'This shows the full AIConfig diff before writing. Nothing is saved until confirmation.',
  'ModelConfig.profile.previewingLabel': 'Calculating preview...',
  'ModelConfig.profile.previewFirstApplyLabel': 'This scope has no AIConfig yet; applying will create one.',
  'ModelConfig.profile.previewNoChangeLabel': 'This profile matches the current configuration.',
  'ModelConfig.profile.previewBeforeLabel': 'Current',
  'ModelConfig.profile.previewAfterLabel': 'After apply',
  'ModelConfig.profile.previewWarningsLabel': 'Warnings',
  'ModelConfig.profile.previewConfirmLabel': 'Confirm write',
  'ModelConfig.profile.previewBackLabel': 'Back',
  'ModelConfig.section.chat.title': 'Text generation',
  'ModelConfig.capability.textGenerate.title': 'ShiJing reading model',
  'ModelConfig.capability.textGenerate.subtitle': 'Runtime AI wording',
  'ModelConfig.capability.textGenerate.detail': 'Bind a Runtime text.generate model for four-mirror readings. Generation fails closed without a binding.',
  'ModelConfig.editor.common.timeoutLabel': 'Timeout',
  'ModelConfig.editor.common.defaultPlaceholder': 'Default',
  'ModelConfig.editor.common.previewBadgeLabel': 'Preview',
  'ModelConfig.editor.textGenerate.parametersLabel': 'Parameters',
  'ModelConfig.editor.textGenerate.generationDefaultsLabel': 'Generation defaults',
  'ModelConfig.editor.textGenerate.responseControlsLabel': 'Response controls',
  'ModelConfig.editor.textGenerate.advancedLabel': 'Advanced settings',
  'ModelConfig.editor.textGenerate.temperatureLabel': 'Temperature',
  'ModelConfig.editor.textGenerate.topPLabel': 'Top P',
  'ModelConfig.editor.textGenerate.topKLabel': 'Top K',
  'ModelConfig.editor.textGenerate.maxTokensLabel': 'Max Tokens',
  'ModelConfig.editor.textGenerate.stopSequencesLabel': 'Stop sequences',
  'ModelConfig.editor.textGenerate.stopSequencesHint': 'Up to {{max}}, one per line.',
  'ModelConfig.editor.textGenerate.stopSequencesPlaceholder': 'Press Enter after typing',
  'ModelConfig.editor.textGenerate.presencePenaltyLabel': 'Presence penalty',
  'ModelConfig.editor.textGenerate.frequencyPenaltyLabel': 'Frequency penalty',
  'ModelConfig.hub.title': 'AI models',
  'ModelConfig.hub.backLabel': 'Back',
  'ModelConfig.hub.aggregateReady': '{{count}} ready',
  'ModelConfig.hub.aggregateAttention': '{{count}} need configuration',
  'ModelConfig.hub.aggregateNeutral': '{{count}} not configured',
  'ModelConfig.hub.aggregateEmpty': 'No capability configuration',
  'ModelConfig.hub.detailTitleFormat': '{{section}} configuration',
  'ModelConfig.hub.activeModelLabel': 'Current model',
  'ModelConfig.hub.detailStatusReady': 'Runtime ready',
  'ModelConfig.hub.detailStatusAttention': 'Needs configuration',
  'ModelConfig.hub.detailStatusNeutral': 'Not configured',
};

export const SHIJING_MODEL_CONFIG_COPY = SHIJING_MODEL_CONFIG_COPY_ZH;

function translateFrom(
  dictionary: Readonly<Record<string, string>>,
  key: string,
  vars?: Readonly<Record<string, string | number>>,
): string {
  const fallback = typeof vars?.defaultValue === 'string' ? vars.defaultValue : key;
  const template = dictionary[key] || fallback;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (current, [name, value]) => current.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}

export function translateShijingModelConfig(
  key: string,
  vars?: Readonly<Record<string, string | number>>,
): string {
  return translateFrom(SHIJING_MODEL_CONFIG_COPY_ZH, key, vars);
}

export function createShijingModelConfigTranslator(language: ModelConfigLanguage) {
  const dictionary =
    language === 'en' ? SHIJING_MODEL_CONFIG_COPY_EN : SHIJING_MODEL_CONFIG_COPY_ZH;
  return (key: string, vars?: Readonly<Record<string, string | number>>) =>
    translateFrom(dictionary, key, vars);
}
