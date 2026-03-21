'use client';

import React, { useEffect, useState } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

const BodyLockStyles = createGlobalStyle`
  body {
    overflow: hidden !important;
    outline: 6px solid #dc2626 !important;
    outline-offset: -6px;
  }
`;

type Phase = 'idle' | 'mounting' | 'mounted' | 'unmounting' | 'unmounted' | 'done';

interface CheckResult {
  label: string;
  pass: boolean;
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Waiting to start...',
  mounting: 'Mounting conditional global style...',
  mounted: 'Verifying: outline + scroll lock applied',
  unmounting: 'Unmounting conditional global style...',
  unmounted: 'Verifying: outline + scroll lock removed',
  done: 'Complete',
};

const PHASE_COLORS: Record<Phase, string> = {
  idle: '#6b7280',
  mounting: '#0070f3',
  mounted: '#dc2626',
  unmounting: '#d97706',
  unmounted: '#0070f3',
  done: '#16a34a',
};

export default function ToggleClient() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [showStyles, setShowStyles] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  useEffect(() => {
    const r: CheckResult[] = [];

    // Phase 1: Check initial state (gradient, no outline)
    const t1 = setTimeout(() => {
      const bg = getComputedStyle(document.body).backgroundImage;
      r.push({ label: 'Gradient present (initial)', pass: bg.includes('linear-gradient') });

      const outline = getComputedStyle(document.body).outlineStyle;
      r.push({ label: 'No outline (initial)', pass: outline === 'none' || outline === '' });

      setPhase('mounting');
      setShowStyles(true);
    }, 400);

    // Phase 2: Verify mounted state
    const t2 = setTimeout(() => {
      setPhase('mounted');
    }, 800);

    const t3 = setTimeout(() => {
      const outline = getComputedStyle(document.body).outlineStyle;
      r.push({ label: 'Outline applied (mounted)', pass: outline === 'solid' });

      const overflow = getComputedStyle(document.body).overflow;
      r.push({ label: 'Scroll locked (mounted)', pass: overflow === 'hidden' });

      const bg = getComputedStyle(document.body).backgroundImage;
      r.push({ label: 'Gradient persists (mounted)', pass: bg.includes('linear-gradient') });

      setPhase('unmounting');
      setShowStyles(false);
    }, 1800);

    // Phase 3: Verify unmounted state
    const t4 = setTimeout(() => {
      setPhase('unmounted');
    }, 2200);

    const t5 = setTimeout(() => {
      const outline = getComputedStyle(document.body).outlineStyle;
      r.push({ label: 'Outline removed (unmounted)', pass: outline === 'none' || outline === '' });

      const overflow = getComputedStyle(document.body).overflow;
      r.push({ label: 'Scroll restored (unmounted)', pass: overflow !== 'hidden' });

      const bg = getComputedStyle(document.body).backgroundImage;
      r.push({ label: 'Gradient persists (unmounted)', pass: bg.includes('linear-gradient') });

      setResults(r);
      setPhase('done');
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const passed = results.filter(r => r.pass).length;

  return (
    <Card>
      <Heading>Conditional mount/unmount — automated test</Heading>

      <PhaseBar $color={PHASE_COLORS[phase]}>
        <PhaseDot $color={PHASE_COLORS[phase]} $animate={phase !== 'done' && phase !== 'idle'} />
        {PHASE_LABELS[phase]}
      </PhaseBar>

      {showStyles && <BodyLockStyles />}

      {phase === 'done' && (
        <ResultsBox $allPass={passed === results.length}>
          <ResultTitle>{passed}/{results.length} passing</ResultTitle>
          {results.map((r, i) => (
            <ResultRow key={i}>
              <ResultIcon $pass={r.pass}>{r.pass ? '\u2713' : '\u2717'}</ResultIcon>
              {r.label}
            </ResultRow>
          ))}
        </ResultsBox>
      )}
    </Card>
  );
}

const Card = styled.div`
  background: var(--sc-colors-surface, #f9fafb);
  border-radius: 10px;
  padding: 24px;
  border: 1px solid var(--sc-colors-border, #e5e7eb);
  margin-bottom: 24px;
`;

const Heading = styled.h2`
  font-size: 18px;
  margin-bottom: 16px;
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

const PhaseBar = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => p.$color}12;
  border: 1px solid ${p => p.$color}30;
  margin-bottom: 16px;
`;

const PhaseDot = styled.span<{ $color: string; $animate: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
  animation: ${p => (p.$animate ? pulse : 'none')} 0.8s ease-in-out infinite;
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const ResultsBox = styled.div<{ $allPass: boolean }>`
  padding: 16px;
  border-radius: 8px;
  border: 1px solid ${p => (p.$allPass ? 'var(--sc-colors-success, #16a34a)' : 'var(--sc-colors-danger, #dc2626)')}40;
  background: ${p => (p.$allPass ? 'var(--sc-colors-success, #16a34a)' : 'var(--sc-colors-danger, #dc2626)')}08;
  animation: ${fadeIn} 0.3s ease-in;
`;

const ResultTitle = styled.p`
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 8px;
  color: var(--sc-colors-text, #111827);
`;

const ResultRow = styled.div`
  font-size: 12px;
  color: var(--sc-colors-textMuted, #6b7280);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ResultIcon = styled.span<{ $pass: boolean }>`
  color: ${p => (p.$pass ? 'var(--sc-colors-success, #16a34a)' : 'var(--sc-colors-danger, #dc2626)')};
  font-weight: 700;
`;
