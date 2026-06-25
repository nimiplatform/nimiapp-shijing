// 命镜 · 七政四余 — "这套算法在看什么" explainer card.

import { useProductCopy } from '../../i18n/copy.ts';
import { GlossTerm } from './qizheng-glossary.tsx';
import { InfoIcon } from './qizheng-icons.tsx';

export function QizhengExplainer() {
  const x = useProductCopy().mingjing.qizhengExplore;

  return (
    <section className="shijing-mingjing-panel shijing-qz-explainer" aria-label={x.explainerTitle}>
      <div className="shijing-qz-explainer__head">
        <InfoIcon className="shijing-qz-explainer__icon" />
        <h3 className="shijing-qz-explainer__title">{x.explainerTitle}</h3>
      </div>
      <p className="shijing-qz-explainer__body">{x.explainerBody}</p>
      <div className="shijing-qz-explainer__cards">
        <div className="shijing-qz-explainer__card">
          <div className="shijing-qz-explainer__card-title">
            <GlossTerm termKey="七政">{x.terms.qizheng}</GlossTerm> · {x.qizhengCardTitle}
          </div>
          <div className="shijing-qz-explainer__card-body">{x.qizhengCardBody}</div>
        </div>
        <div className="shijing-qz-explainer__card">
          <div className="shijing-qz-explainer__card-title">
            <GlossTerm termKey="四余">{x.terms.siyu}</GlossTerm> · {x.siyuCardTitle}
          </div>
          <div className="shijing-qz-explainer__card-body">{x.siyuCardBody}</div>
        </div>
      </div>
      <p className="shijing-qz-explainer__hint">{x.explainerHint}</p>
    </section>
  );
}
