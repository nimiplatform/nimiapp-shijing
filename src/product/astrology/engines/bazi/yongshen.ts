// SJG-ALGO-15 — 用神/喜神/忌神 derivation: 扶抑为主 + 调候为辅.
//   身弱 → 用 生扶 (印/比劫); 身强 → 用 克泄耗 (食伤/财/官杀); 中和 → lean by ratio.
//   调候: extreme-season charts (冬→火, 夏→水) add the climate element to 喜神.

import type { BaziStrength, EarthlyBranch, FiveElement, YongShen } from '../../../../domain/algorithm.ts';
import { tenGodElements } from '../../element-relations.ts';

// 冬 (亥子丑) is cold → warm with 火; 夏 (巳午未) is hot/dry → moisten with 水.
const COLD_MONTH_BRANCHES: ReadonlySet<EarthlyBranch> = new Set<EarthlyBranch>(['hai', 'zi', 'chou']);
const HOT_MONTH_BRANCHES: ReadonlySet<EarthlyBranch> = new Set<EarthlyBranch>(['si', 'wu', 'wei']);

function climateElement(monthBranch: EarthlyBranch): FiveElement | undefined {
  if (COLD_MONTH_BRANCHES.has(monthBranch)) return 'fire';
  if (HOT_MONTH_BRANCHES.has(monthBranch)) return 'water';
  return undefined;
}

function unique(elements: readonly FiveElement[]): FiveElement[] {
  return [...new Set(elements)];
}

export function computeYongShen(
  strength: BaziStrength,
  dayMaster: FiveElement,
  monthBranch: EarthlyBranch,
): YongShen {
  const tg = tenGodElements(dayMaster);
  const support: FiveElement[] = [tg.yin, tg.bijie]; // 生扶 (印, 比劫)
  const drain: FiveElement[] = [tg.shishang, tg.cai, tg.guansha]; // 克泄耗 (食伤, 财, 官杀)

  const basis: string[] = [`band=${strength.band}`];
  let yong: FiveElement[];
  let ji: FiveElement[];

  if (strength.band === '偏弱' || strength.band === '极弱') {
    yong = support; ji = drain; basis.push('身弱: 用印比 (生扶), 忌克泄耗');
  } else if (strength.band === '偏强' || strength.band === '极强') {
    yong = drain; ji = support; basis.push('身强: 用克泄耗, 忌印比');
  } else if (strength.support_ratio >= 0.5) {
    yong = drain; ji = support; basis.push('中和偏强: 微抑 (用克泄耗)');
  } else {
    yong = support; ji = drain; basis.push('中和偏弱: 微扶 (用印比)');
  }

  let xi = [...yong];
  const tiaohou = climateElement(monthBranch);
  if (tiaohou) {
    basis.push(`调候(${monthBranch}): 取 ${tiaohou}`);
    if (!ji.includes(tiaohou) && !xi.includes(tiaohou)) xi = [...xi, tiaohou];
  }

  return {
    yong: unique(yong),
    xi: unique(xi),
    ji: unique(ji),
    ...(tiaohou ? { tiaohou } : {}),
    basis,
  };
}
