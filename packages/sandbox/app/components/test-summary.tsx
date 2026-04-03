'use client';

import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { runCheck, type TestCheck } from './auto-test';

/**
 * Compact summary at the top of a test page showing overall pass/fail.
 */
export function TestSummary({ suites }: { suites: { name: string; checks: TestCheck[] }[] }) {
  const [counts, setCounts] = useState<{ passed: number; total: number } | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      let passed = 0;
      let total = 0;
      for (let i = 0; i < suites.length; i++) {
        const checks = suites[i].checks;
        total += checks.length;
        for (let j = 0; j < checks.length; j++) {
          if (runCheck(checks[j]).pass) passed++;
        }
      }
      setCounts({ passed, total });
    });
  }, [suites]);

  if (!counts) {
    return <Bar $pass={true}>&nbsp;</Bar>;
  }

  const allPass = counts.passed === counts.total;

  return (
    <Bar $pass={allPass}>
      {counts.passed}/{counts.total} passing
    </Bar>
  );
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Bar = styled.p<{ $pass: boolean }>`
  margin: 24px 0;
  font-size: 13px;
  font-weight: 700;
  color: ${p =>
    p.$pass ? 'var(--sc-colors-success, #16a34a)' : 'var(--sc-colors-danger, #dc2626)'};
  animation: ${fadeIn} 0.3s ease-in;
`;
