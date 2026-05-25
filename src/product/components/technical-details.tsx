// Collapsible technical-detail surface. Headlines stay user-facing;
// raw codes / pipeline details are tucked inside this <details> so
// support engineers can still reach the original anchor without
// leaking it to end users.

import { TECHNICAL_DETAILS_SUMMARY } from '../i18n/copy.ts';

export interface TechnicalDetailsProps {
  readonly content: string;
}

export function TechnicalDetails(props: TechnicalDetailsProps) {
  if (!props.content || props.content.trim().length === 0) return null;
  return (
    <details className="shijing-technical-details">
      <summary>{TECHNICAL_DETAILS_SUMMARY}</summary>
      <pre className="shijing-technical-details__pre">{props.content}</pre>
    </details>
  );
}
