// RiJing — 今日关注分镜 (concern frames).
//
// One row per active concern projection. Each row is collapsed by default to a
// single line — icon, concern name, tendency pill, and a one-line takeaway — so
// the surface reads as a scannable index rather than a stack of open cards.
// Expanding a row reveals the full read plus its 今日动作 list. A lens filter
// across the top scopes the list to a single concern.
//
// Tag labels and category icons resolve from the concern-tag snapshot; an
// unresolved ref falls back to the raw ref so nothing is silently dropped.

import { useMemo, useState } from 'react';

import type {
  RiJingConcernProjection,
  TendencyClass,
} from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { InlineConcernEditorPopover } from '../../concern-tags/inline-concern-editor.tsx';
import { ChevronDownIcon, concernIconFor } from './rijing-icons.tsx';
import { useProductCopy } from '../../i18n/copy.ts';
import { deriveRiJingProjectionDisplay } from './rijing-projection-display.ts';

export interface RiJingProjectionsProps {
  readonly projections: readonly RiJingConcernProjection[];
  readonly concernTags: readonly ConcernTag[];
}

const TENDENCY_TONE: Record<TendencyClass, string> = {
  supportive: 'supportive',
  steady: 'steady',
  watch: 'watch',
  blocked: 'blocked',
  turning: 'turning',
};

const ALL_LENS = '__all__';

function tagFor(ref: string, tags: readonly ConcernTag[]): ConcernTag | undefined {
  return tags.find((t) => t.id === ref);
}

export function RiJingProjections(props: RiJingProjectionsProps) {
  const copy = useProductCopy();
  const [lens, setLens] = useState<string>(ALL_LENS);
  const [editorOpen, setEditorOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () =>
      props.projections.map((projection) => {
        const tag = tagFor(projection.concern_tag_ref, props.concernTags);
        const display = deriveRiJingProjectionDisplay({ projection, tag });
        return {
          projection,
          ...display,
          Icon: concernIconFor(display.name, tag?.parsed_topics ?? []),
          tone: TENDENCY_TONE[projection.tendency_class],
          tendencyLabel: copy.tendencyClassLabels[projection.tendency_class],
        };
      }),
    [props.projections, props.concernTags, copy],
  );

  if (rows.length === 0) return null;

  const visible = lens === ALL_LENS ? rows : rows.filter((r) => r.projection.concern_tag_ref === lens);

  return (
    <section className="shijing-rijing__projections" aria-label={copy.rijing.projections.ariaLabel}>
      <header className="shijing-rijing__projections-head">
        <h2 className="shijing-rijing__projections-title">{copy.rijing.projections.title}</h2>
        <div
          className="shijing-rijing__lens"
          role="group"
          aria-label={copy.rijing.projections.filterAria}
        >
          <button
            type="button"
            className="shijing-rijing__lens-chip"
            data-active={lens === ALL_LENS}
            aria-pressed={lens === ALL_LENS}
            onClick={() => setLens(ALL_LENS)}
          >
            {copy.rijing.projections.allLabel}
          </button>
          {rows.map((row) => (
            <button
              key={row.projection.concern_tag_ref}
              type="button"
              className="shijing-rijing__lens-chip"
              data-active={lens === row.projection.concern_tag_ref}
              aria-pressed={lens === row.projection.concern_tag_ref}
              onClick={() => setLens(row.projection.concern_tag_ref)}
            >
              {row.name}
            </button>
          ))}
          <span className="shijing-rijing__editor-anchor">
            <button
              type="button"
              className="shijing-rijing__lens-manage"
              aria-expanded={editorOpen}
              aria-haspopup="dialog"
              onClick={() => setEditorOpen((open) => !open)}
            >
              ✎ {copy.rijing.projections.manage}
            </button>
            {editorOpen ? (
              <InlineConcernEditorPopover
                classNamePrefix="shijing-rijing-concern-editor"
                ariaLabel={copy.rijing.projections.manage}
                title={copy.rijing.projections.manage}
                subtitle={copy.rijing.projections.editorSubtitle}
                activeHeading={copy.concerns.activeGroup}
                addableHeading={copy.concerns.addableGroup}
                removeLabel={copy.concerns.remove}
                addLabel={copy.concerns.addTitle}
                customPlaceholder={copy.concerns.customPlaceholder}
                onClose={() => setEditorOpen(false)}
              />
            ) : null}
          </span>
        </div>
      </header>

      <ul className="shijing-rijing__frames">
        {visible.map((row) => {
          const ref = row.projection.concern_tag_ref;
          const open = expanded[ref] ?? false;
          const { Icon } = row;
          return (
            <li key={ref} className="shijing-rijing__frame">
              <button
                type="button"
                className="shijing-rijing__frame-row"
                onClick={() => setExpanded((cur) => ({ ...cur, [ref]: !open }))}
                aria-expanded={open}
                aria-label={copy.rijing.projections.expandAria(row.name)}
              >
                <span className="shijing-rijing__frame-icon" data-tone={row.tone} aria-hidden>
                  <Icon />
                </span>
                <span className="shijing-rijing__frame-meta">
                  <span className="shijing-rijing__frame-name">{row.name}</span>
                  <span className="shijing-rijing__frame-pill" data-tone={row.tone}>
                    {row.tendencyLabel}
                  </span>
                </span>
                <span className="shijing-rijing__frame-takeaway">{row.collapsedSummary}</span>
                <span className="shijing-rijing__frame-chevron" data-open={open} aria-hidden>
                  <ChevronDownIcon />
                </span>
              </button>
              {open ? (
                <div className="shijing-rijing__frame-detail">
                  <div className="shijing-rijing__frame-detail-divider" aria-hidden />
                  <p className="shijing-rijing__frame-detail-body">{row.detailSummary}</p>
                  {row.recommendations.length > 0 ? (
                    <>
                      <div className="shijing-rijing__frame-actions-label">
                        {copy.rijing.projections.actionsLabel}
                      </div>
                      <ul className="shijing-rijing__frame-actions">
                        {row.recommendations.map((rec, i) => (
                          <li key={i} className="shijing-rijing__frame-action">
                            <span className="shijing-rijing__frame-action-dot" aria-hidden />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
