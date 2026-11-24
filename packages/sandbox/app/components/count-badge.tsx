'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';

type Props = {
  /** Expected count for the pass state. */
  expected: number;
  /** Count the rules in styled-components sheets whose text contains this string. */
  ruleNeedle: string;
  /** Short noun describing what is being counted (rendered after the count). */
  unit: React.ReactNode;
  /** Optional tooltip text exposed via the `title` attribute. */
  title?: string;
};

/**
 * Live count vs expected, rendered as a green/red pill. The needle is a string so the component
 * stays usable from RSC pages (function props can't cross the server→client boundary).
 */
export function CountBadge(props: Props) {
  const [count, setCount] = useState<number | null>(null);
  const { ruleNeedle } = props;

  useEffect(() => {
    requestAnimationFrame(() => {
      setCount(countSheetRuleOccurrences(ruleNeedle));
    });
  }, [ruleNeedle]);

  if (count === null) {
    return <Badge $ok={true}>Counting…</Badge>;
  }

  const ok = count === props.expected;
  return (
    <Badge $ok={ok} data-check={ok ? 'pass' : 'fail'} title={props.title}>
      {ok ? '✓' : '✗'} {count} of {props.expected} expected {props.unit}
      {count === 1 ? '' : 's'}
    </Badge>
  );
}

/**
 * Counts how many rules in styled-components-managed sheets contain `needle` in their cssText.
 * Server component and client rules alike live in the registry's `<style data-styled>` tags (text
 * from the server, CSSOM once the browser adopts them), so the count is how often the needle
 * appears across all sc sheets, not how many tags carry it.
 */
export function countSheetRuleOccurrences(needle: string): number {
  let count = 0;
  const tags = document.querySelectorAll<HTMLStyleElement>('style[data-styled]');
  for (const tag of Array.from(tags)) {
    const sheet = tag.sheet;
    if (!sheet) continue;
    try {
      for (let i = 0; i < sheet.cssRules.length; i++) {
        if (sheet.cssRules[i].cssText.includes(needle)) count++;
      }
    } catch {
      // cross-origin or otherwise inaccessible sheet; skip
    }
  }
  return count;
}

const Badge = styled.div<{ $ok: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => (p.$ok ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)')};
  color: ${p => (p.$ok ? '#16a34a' : '#dc2626')};
  border: 1px solid ${p => (p.$ok ? '#16a34a' : '#dc2626')};
  font-family: monospace;
`;
