// 出生地点 autocomplete — type a city, pick a match, and the caller fills in
// latitude / longitude / IANA time zone from the bundled gazetteer. Free text
// is still allowed (so unlisted places work); picking a suggestion is just the
// fast path that removes the need to know coordinates.

import { useEffect, useMemo, useRef, useState } from 'react';
import { searchGazetteer, type GazetteerEntry } from './gazetteer.ts';

export interface PlaceAutocompleteProps {
  readonly value: string;
  readonly onTextChange: (text: string) => void;
  readonly onSelect: (entry: GazetteerEntry) => void;
  readonly id?: string;
  readonly placeholder?: string;
}

export function PlaceAutocomplete({ value, onTextChange, onSelect, id, placeholder }: PlaceAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const candidates = useMemo(() => searchGazetteer(value), [value]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  function choose(entry: GazetteerEntry) {
    onSelect(entry);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || candidates.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, candidates.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      const pick = candidates[highlight];
      if (pick) {
        event.preventDefault();
        choose(pick.entry);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const showMenu = open && candidates.length > 0;

  return (
    <div className="sjp-place" ref={wrapRef}>
      <input
        id={id}
        type="text"
        className="sjp-input"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onTextChange(e.currentTarget.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showMenu}
        aria-autocomplete="list"
      />
      {showMenu ? (
        <ul className="sjp-place__menu" role="listbox">
          {candidates.map((candidate, index) => (
            <li
              key={candidate.entry.id}
              role="option"
              aria-selected={index === highlight}
              className={`sjp-place__option${index === highlight ? ' is-active' : ''}`}
              // mousedown (not click) so the input's blur doesn't pre-empt it
              onMouseDown={(e) => {
                e.preventDefault();
                choose(candidate.entry);
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              <span className="sjp-place__name">
                {candidate.entry.name}
                {candidate.entry.region.length > 0 ? (
                  <span className="sjp-place__region"> · {candidate.entry.region}</span>
                ) : null}
              </span>
              <span className="sjp-place__coords">
                {candidate.entry.lat.toFixed(2)}, {candidate.entry.lng.toFixed(2)} · {candidate.entry.tz}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
