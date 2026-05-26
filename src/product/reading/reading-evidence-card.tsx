import type { Reading } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import {
  formatConfidence,
  formatDateRange,
  formatKeyWindowLabel,
  formatMarkerKind,
  formatMarkerStrength,
  formatMethodName,
  formatReadingCreatedAt,
  formatRecommendationHorizon,
  formatTimeWindow,
  formatTimestamp,
  formatUncertaintyItem,
} from './reading-format.ts';

export interface ReadingEvidenceCardProps {
  readonly reading: Reading;
  readonly space: ShiJingSpace;
  readonly heading: string;
  readonly expired?: boolean;
  readonly expiredMessage?: string;
}

function shortHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function EmptyEvidence(props: { readonly children: string }) {
  return <p className="shijing-reading-card__empty">{props.children}</p>;
}

function ReadingDefaultLayer(props: ReadingEvidenceCardProps) {
  const { reading, space } = props;
  return (
    <>
      <header className="shijing-card__head shijing-reading-card__head">
        <div>
          <h3>{props.heading}</h3>
          <div className="shijing-reading-card__chips" aria-label="解读锚点">
            <span className="shijing-chip">{enumLabel('reading_kind', reading.kind)}</span>
            <span className="shijing-chip">{enumLabel('reading_scope', reading.scope)}</span>
            <span className="shijing-chip">锚点：{subjectDisplayName(reading.anchor_subject, space)}</span>
          </div>
        </div>
        <small>{formatReadingCreatedAt(reading)}</small>
      </header>

      {props.expired ? (
        <p className="shijing-status shijing-status--alert" role="status">
          {props.expiredMessage}
        </p>
      ) : null}

      <dl className="shijing-reading-card__summary-grid" aria-label="解读范围">
        <div>
          <dt>生成时间</dt>
          <dd>{formatReadingCreatedAt(reading)}</dd>
        </div>
        <div>
          <dt>时间窗</dt>
          <dd>{formatTimeWindow(reading.time_window)}</dd>
        </div>
      </dl>

      <section className="shijing-reading-card__section" aria-label="解读正文">
        <p className="shijing-reading__summary">{reading.output.summary}</p>
      </section>

      <section className="shijing-reading-card__section" aria-label="重点">
        <h4>重点</h4>
        {reading.output.highlights.length > 0 ? (
          <ul className="shijing-reading-card__list">
            {reading.output.highlights.map((item, index) => (
              <li key={`${index}-${item.label}`}>
                <strong>{item.label}</strong>
                <span>{item.body}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无重点条目。</EmptyEvidence>
        )}
      </section>

      <section className="shijing-reading-card__section" aria-label="建议">
        <h4>建议</h4>
        {reading.output.recommendations.length > 0 ? (
          <ul className="shijing-reading__recs">
            {reading.output.recommendations.map((rec, idx) => (
              <li key={idx}>
                <span className="shijing-reading__rec-body">{rec.body}</span>
                <span className="shijing-reading__rec-horizon">
                  {formatRecommendationHorizon(rec.horizon)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无建议条目。</EmptyEvidence>
        )}
      </section>

      <section className="shijing-reading-card__section" aria-label="不确定性">
        <h4>可信度</h4>
        <p className="shijing-reading-card__confidence">
          {formatConfidence(reading.uncertainty.confidence)}
        </p>
        <div className="shijing-reading-card__split">
          <div>
            <strong>注意</strong>
            {reading.uncertainty.caveats.length > 0 ? (
              <ul>
                {reading.uncertainty.caveats.map((item) => (
                  <li key={item}>{formatUncertaintyItem(item)}</li>
                ))}
              </ul>
            ) : (
              <EmptyEvidence>暂无额外注意项。</EmptyEvidence>
            )}
          </div>
          <div>
            <strong>数据缺口</strong>
            {reading.uncertainty.data_gaps.length > 0 ? (
              <ul>
                {reading.uncertainty.data_gaps.map((item) => (
                  <li key={item}>{formatUncertaintyItem(item)}</li>
                ))}
              </ul>
            ) : (
              <EmptyEvidence>暂无数据缺口。</EmptyEvidence>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function ReadingTechnicalDetails(props: { readonly reading: Reading; readonly space: ShiJingSpace }) {
  const { reading, space } = props;
  const summary = reading.inputs_summary;
  const feature = summary.feature_snapshot;
  const stageDrivers = feature.subjects.flatMap((subject) => subject.stage_drivers);
  const basisTimeZone = reading.time_window.basis_time_zone;

  return (
    <details className="shijing-reading-card__details">
      <summary>生成依据 / 技术详情</summary>

      <dl className="shijing-reading-card__evidence" aria-label="技术证据">
        <div>
          <dt>方法</dt>
          <dd>
            {formatMethodName(summary.method_profile.id)}
            <br />
            <code>{summary.method_profile.id}</code>
          </dd>
        </div>
        <div>
          <dt>守时阶段</dt>
          <dd>{feature.stage_label}阶段</dd>
        </div>
        <div>
          <dt>输入哈希</dt>
          <dd><code>{shortHash(summary.input_hash)}</code></dd>
        </div>
        <div>
          <dt>特征快照</dt>
          <dd><code>{shortHash(summary.feature_snapshot_hash)}</code></dd>
        </div>
      </dl>

      <section className="shijing-reading-card__section" aria-label="主体快照">
        <h4>主体快照</h4>
        {summary.subject_summaries.length > 0 ? (
          <ul className="shijing-reading-card__list">
            {summary.subject_summaries.map((entry, index) => (
              <li key={`${index}-${entry.summary}`}>{entry.summary}</li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无主体快照。</EmptyEvidence>
        )}
      </section>

      <section className="shijing-reading-card__section" aria-label="关系摘要">
        <h4>关系摘要</h4>
        {summary.relation_summaries.length > 0 ? (
          <ul className="shijing-reading-card__list">
            {summary.relation_summaries.map((relation, index) => (
              <li key={`${index}-${relation.relation_kind}`}>
                <strong>{relation.relation_kind}</strong>
                <span>
                  {subjectDisplayName(relation.from_subject, space)} → {subjectDisplayName(relation.to_subject, space)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无关系摘要。</EmptyEvidence>
        )}
      </section>

      <section className="shijing-reading-card__section" aria-label="事件摘要">
        <h4>事件摘要</h4>
        {summary.event_summaries.length > 0 ? (
          <ul className="shijing-reading-card__list">
            {summary.event_summaries.map((event, index) => (
              <li key={`${index}-${event.occurred_at}-${event.title}`}>
                <strong>{event.title}</strong>
                <span>
                  {formatTimestamp(event.occurred_at, basisTimeZone)} · {subjectDisplayName(event.subject, space)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无事件摘要。</EmptyEvidence>
        )}
      </section>

      <section className="shijing-reading-card__section" aria-label="关键窗口">
        <h4>关键窗口</h4>
        {feature.key_windows.length > 0 ? (
          <ul className="shijing-reading-card__list">
            {feature.key_windows.map((window, index) => (
              <li key={`${index}-${window.start_utc}-${window.end_utc}`}>
                <strong>{formatKeyWindowLabel(window.label)}</strong>
                <span>
                  {formatDateRange(window.start_utc, window.end_utc, basisTimeZone)} · {window.driver}
                  {' '}
                  <code>{window.label}</code>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无关键窗口。</EmptyEvidence>
        )}
      </section>

      <section className="shijing-reading-card__section" aria-label="阶段驱动">
        <h4>阶段驱动</h4>
        {stageDrivers.length > 0 ? (
          <ul className="shijing-reading-card__list">
            {stageDrivers.map((driver, index) => (
              <li key={`${index}-${driver.explanation_key}`}>
                <strong>{driver.stage_label}阶段</strong>
                <span>
                  {formatMarkerKind(driver.marker_kind)} · {formatMarkerStrength(driver.strength)}
                  {' '}
                  <code>{driver.marker_kind}</code>
                  {' '}
                  <code>{driver.strength}</code>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无阶段驱动。</EmptyEvidence>
        )}
      </section>

      {summary.view_snapshot ? (
        <section className="shijing-reading-card__section" aria-label="视角快照">
          <h4>视角快照</h4>
          <dl className="shijing-reading-card__evidence">
            <div>
              <dt>视角</dt>
              <dd><code>{summary.view_snapshot.view_id}</code></dd>
            </div>
            <div>
              <dt>上下文</dt>
              <dd><code>{shortHash(summary.view_snapshot.context_items_hash)}</code></dd>
            </div>
            <div>
              <dt>记忆</dt>
              <dd><code>{shortHash(summary.view_snapshot.memory_summary_hash)}</code></dd>
            </div>
          </dl>
        </section>
      ) : null}

      {summary.ad_hoc_context ? (
        <section className="shijing-reading-card__section" aria-label="临场上下文">
          <h4>临场上下文</h4>
          <p className="shijing-reading-card__context">{summary.ad_hoc_context}</p>
        </section>
      ) : null}

      <section className="shijing-reading-card__section" aria-label="引用">
        <h4>引用</h4>
        {reading.output.citations.length > 0 ? (
          <ul className="shijing-reading-card__list">
            {reading.output.citations.map((citation, index) => (
              <li key={`${index}-${citation.method}-${citation.reference}`}>
                <strong>{formatMethodName(citation.method)}</strong>
                <span>
                  {citation.reference} <code>{citation.method}</code>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>暂无引用。</EmptyEvidence>
        )}
      </section>
    </details>
  );
}

export function ReadingEvidenceCard(props: ReadingEvidenceCardProps) {
  return (
    <article className="shijing-card shijing-card--reading shijing-reading-card">
      <ReadingDefaultLayer {...props} />
      <ReadingTechnicalDetails reading={props.reading} space={props.space} />
    </article>
  );
}
