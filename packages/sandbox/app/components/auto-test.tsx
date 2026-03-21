'use client';

import { useEffect, useState } from 'react';
import styled from 'styled-components';

export interface TestCheck {
  /** Readable label for the check */
  label: string;
  /** CSS selector or data-testid to find the element */
  ref: string;
  /** Type of check to perform */
  type: 'style' | 'style-not' | 'element' | 'attr' | 'exists';
  /** CSS property name (for style checks) or attribute name (for attr checks) */
  prop?: string;
  /** Expected value — for style checks, compared case-insensitively; for element checks, compared against tagName */
  expected?: string;
  /** CSS var name (e.g. '--sc-colors-primary') — resolved at runtime as the expected value */
  expectedVar?: string;
}

interface Result {
  label: string;
  pass: boolean;
  detail: string;
}

function hexToRgb(hex: string): string {
  let h = hex.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return 'rgb(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')';
}

export function runCheck(check: TestCheck): Result {
  const el = check.ref.startsWith('[')
    ? document.querySelector(check.ref)
    : document.querySelector('[data-testid="' + check.ref + '"]');

  if (!el) {
    return { label: check.label, pass: false, detail: 'element not found' };
  }

  if (check.type === 'exists') {
    return { label: check.label, pass: true, detail: 'found' };
  }

  if (check.type === 'element') {
    const actual = el.tagName.toLowerCase();
    const pass = actual === (check.expected || '').toLowerCase();
    return { label: check.label, pass, detail: actual };
  }

  if (check.type === 'attr') {
    const actual = el.getAttribute(check.prop || '') || '';
    const pass = actual === check.expected;
    return { label: check.label, pass, detail: actual || '(empty)' };
  }

  // style check (or style-not: pass when value does NOT match)
  const actual = getComputedStyle(el).getPropertyValue(check.prop || '').trim();
  let resolved = check.expectedVar
    ? getComputedStyle(document.documentElement).getPropertyValue(check.expectedVar).trim()
    : check.expected || '';
  // Normalize hex to rgb so comparisons work against getComputedStyle output
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(resolved)) {
    resolved = hexToRgb(resolved);
  }
  const expected = resolved.toLowerCase();
  const matches = actual.toLowerCase() === expected || actual.toLowerCase().includes(expected);
  const pass = check.type === 'style-not' ? !matches : matches;
  return { label: check.label, pass, detail: actual };
}

/**
 * Inline pass/fail indicator for a test section title.
 * Renders a colored checkmark or X after running checks post-hydration.
 */
export function TestStatus({ checks }: { checks: TestCheck[] }) {
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      const out: Result[] = [];
      for (let i = 0; i < checks.length; i++) {
        out.push(runCheck(checks[i]));
      }
      setResults(out);
    });
  }, [checks]);

  if (!results) return null;

  const allPass = results.every(r => r.pass);

  return (
    <Indicator $pass={allPass} title={results.map(r => (r.pass ? '\u2713' : '\u2717') + ' ' + r.label + ': ' + r.detail).join('\n')}>
      {allPass ? '\u2713' : '\u2717'}
    </Indicator>
  );
}

const Indicator = styled.span<{ $pass: boolean }>`
  color: ${p => (p.$pass ? p.theme.colors.success : p.theme.colors.danger)};
  font-weight: 700;
  margin-left: 8px;
  font-size: 18px;
  cursor: help;
`;
