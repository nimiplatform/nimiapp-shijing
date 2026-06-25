// 命镜 · 七政四余 — 重点格局 (rule-based highlights, expandable).

import { useState } from 'react';
import { useProductCopy } from '../../i18n/copy.ts';
import { ChevronIcon } from './qizheng-icons.tsx';
import type { QizhengPatternView } from './qizheng-narrative.ts';

export function QizhengPatterns({ patterns }: { readonly patterns: readonly QizhengPatternView[] }) {
  const x = useProductCopy().mingjing.qizhengExplore;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (patterns.length === 0) return null;

  return (
    <section className="shijing-qz-patterns" aria-label={x.patternsTitle}>
      <div className="shijing-qz-section-head shijing-qz-section-head--loose">
        <h3 className="shijing-qz-section-title">{x.patternsTitle}</h3>
        <span className="shijing-qz-section-hint">{x.patternsHint}</span>
      </div>
      <div className="shijing-qz-patterns__list">
        {patterns.map((pattern) => {
          const expanded = !!open[pattern.id];
          return (
            <article key={pattern.id} className="shijing-qz-pattern" data-expanded={expanded ? '' : undefined}>
              <button
                type="button"
                className="shijing-qz-pattern__head"
                aria-expanded={expanded}
                onClick={() => setOpen((prev) => ({ ...prev, [pattern.id]: !prev[pattern.id] }))}
              >
                <span className="shijing-qz-pattern__tag" data-tone={pattern.tone}>{pattern.tag}</span>
                <span className="shijing-qz-pattern__body">
                  <span className="shijing-qz-pattern__title">{pattern.title}</span>
                  <span className="shijing-qz-pattern__summary">{pattern.summary}</span>
                </span>
                <span className="shijing-qz-pattern__glyphs">
                  {pattern.glyphs.map((glyph, index) => (
                    <span key={`${glyph.name}-${index}`} className="shijing-qz-pattern__glyph" style={{ background: glyph.color }}>
                      {glyph.name}
                    </span>
                  ))}
                </span>
                <ChevronIcon className="shijing-qz-pattern__chevron" />
              </button>
              {expanded ? (
                <div className="shijing-qz-pattern__detail">
                  <p>{pattern.deep}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
