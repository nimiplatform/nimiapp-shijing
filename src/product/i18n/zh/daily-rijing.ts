// ZH daily RiJing run product copy.

import type { ProductCopy } from '../copy-types.ts';

export const ZH_DAILY_RIJING_COPY: ProductCopy['dailyRiJing'] = {
  title: '每日日镜',
  enable: '每天自动生成日镜',
  time: '生成时间',
  note: '只在时镜打开时按北京时间运行；关闭或休眠期间错过的时间不会补做。',
  saved: (enabled, time) => (enabled ? `已开启每日日镜，每天 ${time} 生成` : '已关闭每日日镜'),
  saveFailed: (detail) => `每日日镜设置未保存：${detail}`,
  pageNote: (time) => `每日日镜已开启：今天的日镜会在 ${time} 自动生成，错过不补做；也可以现在手动生成。`,
  notice: {
    blocked: {
      persistence_unavailable: '今日日镜未能自动生成：本地数据暂时无法读写。',
      profile_incomplete: '今日日镜未能自动生成：本人档案还不完整。',
      missing_focus: '今日日镜未能自动生成：还没有启用的关注。',
    },
    failed: (reason) => `今日日镜自动运行：${reason}`,
    saveFailed: (detail) => `今日日镜已生成但未能保存：${detail}`,
    view: '查看日镜',
    unsynced: '日镜已保存，但还没有同步到 Nimi 活动。',
    retrySync: '重新同步',
  },
  activity: {
    title: (month, day) => `${month}月${day}日的日镜已生成`,
    summary: (dayPillar, methodLabel) => (dayPillar ? `${dayPillar}日 · ${methodLabel}` : methodLabel),
  },
};
