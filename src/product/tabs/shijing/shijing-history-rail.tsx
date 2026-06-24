import { Tooltip } from '@nimiplatform/kit/ui';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { Conversation } from '../../../domain/conversation.ts';
import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import { FilterIcon, SearchIcon } from './shijing-icons.tsx';
import {
  firstUserQuestion,
  groupConversations,
  sessionTimeLabel,
} from './shijing-session-model.ts';

type SessionGroup = ReturnType<typeof groupConversations>[number];

export interface ShiJingHistoryRailProps {
  readonly search: string;
  readonly filterOpen: boolean;
  readonly selectedFilterConcernIds: readonly string[];
  readonly activeConcernTags: readonly ConcernTag[];
  readonly sessionGroups: readonly SessionGroup[];
  readonly conversationsLength: number;
  readonly resultConversation: Conversation | null;
  readonly draftingNewQuestion: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onToggleFilterOpen: () => void;
  readonly onClearFilter: () => void;
  readonly onToggleFilterConcern: (id: string) => void;
  readonly onStartNewQuestion: () => void;
  readonly onSelectConversation: (id: string) => void;
}

export function ShiJingHistoryRail(props: ShiJingHistoryRailProps) {
  const copy = useProductCopy();
  const filterButtonLabel = props.selectedFilterConcernIds.length > 0
    ? copy.shijing.archive.filterButtonActive(props.selectedFilterConcernIds.length)
    : copy.shijing.archive.filterButton;

  return (
    <aside className="shijing-ask__rail" aria-label={copy.shijing.railAria}>
      <div className="shijing-ask__rail-head">
        <button
          type="button"
          className="shijing-ask__new-question"
          aria-label={copy.shijing.newQuestionAria}
          aria-current={props.draftingNewQuestion ? 'true' : undefined}
          onClick={props.onStartNewQuestion}
        >
          <span aria-hidden>+</span>
          {copy.shijing.newQuestion}
        </button>
        <div className="shijing-ask__search">
          <div className="shijing-ask__search-row">
            <div className="shijing-ask__search-input">
              <SearchIcon className="shijing-ask__search-icon" />
              <input
                type="text"
                value={props.search}
                onChange={(e) => props.onSearchChange(e.currentTarget.value)}
                placeholder={copy.shijing.searchPlaceholder}
                aria-label={copy.shijing.searchAria}
              />
            </div>
            <span className="shijing-ask__filter">
              <Tooltip content={filterButtonLabel} placement="top">
                <button
                  type="button"
                  className="shijing-ask__filter-button"
                  aria-label={filterButtonLabel}
                  aria-expanded={props.filterOpen}
                  aria-haspopup="menu"
                  data-active={props.selectedFilterConcernIds.length > 0 ? 'true' : 'false'}
                  onClick={props.onToggleFilterOpen}
                >
                  <FilterIcon className="shijing-ask__filter-icon" />
                </button>
              </Tooltip>
              {props.filterOpen ? (
                <div className="shijing-ask__filter-menu" role="menu" aria-label={copy.shijing.archive.filterMenuAria}>
                  <button
                    type="button"
                    className="shijing-ask__filter-option"
                    role="menuitemcheckbox"
                    aria-checked={props.selectedFilterConcernIds.length === 0}
                    onClick={props.onClearFilter}
                  >
                    <span>{copy.shijing.archive.filterAll}</span>
                    <span aria-hidden>{props.selectedFilterConcernIds.length === 0 ? 'x' : ''}</span>
                  </button>
                  {props.activeConcernTags.length === 0 ? (
                    <p className="shijing-ask__filter-empty">{copy.shijing.archive.filterEmpty}</p>
                  ) : (
                    props.activeConcernTags.map((tag) => {
                      const selected = props.selectedFilterConcernIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className="shijing-ask__filter-option"
                          role="menuitemcheckbox"
                          aria-checked={selected}
                          onClick={() => props.onToggleFilterConcern(tag.id)}
                        >
                          <span>{trimmedConcernLabel(tag)}</span>
                          <span aria-hidden>{selected ? 'x' : ''}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      {props.sessionGroups.length === 0 ? (
        <div className="shijing-ask__rail-empty">
          <span className="shijing-ask__rail-empty-icon" aria-hidden>
            ✎
          </span>
          <p className="shijing-ask__rail-empty-title">
            {props.conversationsLength === 0 ? copy.shijing.emptyHistory : copy.shijing.emptySearch}
          </p>
          <p className="shijing-ask__rail-empty-desc">{copy.shijing.emptyHistoryDescription}</p>
        </div>
      ) : (
        <div className="shijing-ask__sessions">
          {props.sessionGroups.map((group) => (
            <div key={group.label} className="shijing-ask__session-group">
              <p className="shijing-ask__session-group-label">{group.label}</p>
              <ul>
                {group.items.map((conv) => (
                  <li key={conv.id}>
                    <button
                      type="button"
                      className="shijing-ask__session"
                      aria-current={conv === props.resultConversation ? 'true' : undefined}
                      onClick={() => props.onSelectConversation(conv.id)}
                    >
                      <span className="shijing-ask__session-q">{firstUserQuestion(conv, copy)}</span>
                      <span className="shijing-ask__session-time">
                        {sessionTimeLabel(conv.created_at, copy)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
