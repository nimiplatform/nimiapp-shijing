// Shared copy helpers used by language payload modules.

const ZH_TWELVE_STAGE_LABELS: Readonly<Record<string, string>> = {
  长生: '长生（生发）',
  沐浴: '沐浴（调整）',
  冠带: '冠带（成形）',
  临官: '临官（成事）',
  帝旺: '帝旺（峰值）',
  衰: '衰（回落）',
  病: '病（失衡）',
  死: '死（收束）',
  墓: '墓（收藏）',
  绝: '绝（断旧）',
  胎: '胎（酝酿）',
  养: '养（培育）',
};

const EN_TWELVE_STAGE_LABELS: Readonly<Record<string, string>> = {
  长生: 'Changsheng (emergence)',
  沐浴: 'Muyu (adjustment)',
  冠带: 'Guandai (forming)',
  临官: 'Linguan (taking office)',
  帝旺: 'Diwang (peak)',
  衰: 'Shuai (decline)',
  病: 'Bing (imbalance)',
  死: 'Si (closure)',
  墓: 'Mu (storage)',
  绝: 'Jue (cutover)',
  胎: 'Tai (gestation)',
  养: 'Yang (nurturing)',
};

export function zhTwelveStageLabel(terrain: string): string {
  return ZH_TWELVE_STAGE_LABELS[terrain] ?? `${terrain}（十二长生阶段）`;
}

export function enTwelveStageLabel(terrain: string): string {
  return EN_TWELVE_STAGE_LABELS[terrain] ?? `${terrain} (twelve-stage term)`;
}

function zhSelfRevealFailureDetail(reason: string): string {
  switch (reason) {
    case 'runtime_presence_unavailable':
      return '当前设备还没有可用的 Nimi 本机本人确认能力，完整资料会继续隐藏。';
    case 'runtime_account_unavailable':
      return '当前 Nimi 账号状态不可用，请重新登录后再试。';
    case 'runtime_presence_caller_unauthorized':
      return '当前应用实例没有通过 Nimi 本机验证准入。';
    case 'presence_verification_rejected':
      return '本人确认没有通过，完整资料会继续隐藏。';
    case 'presence_verification_cancelled':
      return '本人确认已取消，完整资料会继续隐藏。';
    case 'presence_verification_expired':
      return '本次本人确认已过期，请重新确认。';
    case 'presence_subject_mismatch':
      return '本次确认的账号与当前档案不一致。';
    case 'shijing_presence_verification_unconfigured':
      return 'ShiJing 尚未连接 Nimi 本人确认能力。';
    case 'presence_verification_failed':
    default:
      return '本人确认暂未通过，完整资料会继续隐藏。';
  }
}

function enSelfRevealFailureDetail(reason: string): string {
  switch (reason) {
    case 'runtime_presence_unavailable':
      return 'Nimi presence verification is not available on this device yet, so the full profile remains hidden.';
    case 'runtime_account_unavailable':
      return 'the current Nimi account session is unavailable. Sign in again and retry.';
    case 'runtime_presence_caller_unauthorized':
      return 'this app instance is not admitted for Nimi presence verification.';
    case 'presence_verification_rejected':
      return 'presence verification was not approved.';
    case 'presence_verification_cancelled':
      return 'presence verification was cancelled.';
    case 'presence_verification_expired':
      return 'presence verification expired. Verify again to reveal the profile.';
    case 'presence_subject_mismatch':
      return 'the verified account does not match this profile.';
    case 'shijing_presence_verification_unconfigured':
      return 'ShiJing is not connected to Nimi presence verification yet.';
    case 'presence_verification_failed':
    default:
      return 'presence verification did not complete, so the full profile remains hidden.';
  }
}

export function zhSelfRevealSensitiveFailed(reason: string): string {
  return `暂时无法显示完整资料：${zhSelfRevealFailureDetail(reason)}`;
}

export function enSelfRevealSensitiveFailed(reason: string): string {
  return `Full profile is still hidden: ${enSelfRevealFailureDetail(reason)}`;
}
