'use client';

import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

/**
 * Composite summary for all global style lifecycle tests.
 * Listens for 'sc-test-result' custom events dispatched by
 * individual test components (layout checks, autopilot).
 */
export function GlobalStyleChecks() {
  const [totals, setTotals] = useState<{ passed: number; total: number }>({ passed: 0, total: 0 });
  const [received, setReceived] = useState(0);

  useEffect(() => {
    // Run immediate layout checks and report
    requestAnimationFrame(() => {
      let passed = 0;
      const total = 2;

      if (getComputedStyle(document.body).backgroundImage.includes('linear-gradient')) passed++;

      // getComputedStyle resolves 100vh to pixels
      if (parseInt(getComputedStyle(document.body).minHeight) > 0) passed++;

      setTotals(prev => ({ passed: prev.passed + passed, total: prev.total + total }));
      setReceived(r => r + 1);
    });

    // Listen for results from other test components
    const handler = (e: Event) => {
      const { passed, total } = (e as CustomEvent).detail;
      setTotals(prev => ({ passed: prev.passed + passed, total: prev.total + total }));
      setReceived(r => r + 1);
    };

    window.addEventListener('sc-test-result', handler);
    return () => window.removeEventListener('sc-test-result', handler);
  }, []);

  if (received === 0) {
    return <Summary $pass={true}>&nbsp;</Summary>;
  }

  const allPass = totals.passed === totals.total;

  return (
    <Summary $pass={allPass}>
      {totals.passed}/{totals.total} passing
    </Summary>
  );
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Summary = styled.p<{ $pass: boolean }>`
  margin: 24px 0;
  font-size: 13px;
  font-weight: 700;
  color: ${p => (p.$pass ? 'var(--sc-colors-success, #16a34a)' : 'var(--sc-colors-danger, #dc2626)')};
  animation: ${fadeIn} 0.3s ease-in;
`;
