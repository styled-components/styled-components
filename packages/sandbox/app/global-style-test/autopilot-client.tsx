'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

const BodyLockStyles = createGlobalStyle`
  body {
    overflow: hidden !important;
    outline: 6px solid #dc2626 !important;
    outline-offset: -6px;
  }
`;

interface Step {
  label: string;
  color: string;
}

const ROUTES = [
  '/global-style-test',
  '/global-style-test/page-a',
  '/global-style-test/page-b',
  '/global-style-test',
];

interface CheckResult {
  label: string;
  pass: boolean;
}

export default function AutopilotClient() {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [showLock, setShowLock] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [done, setDone] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>({
    label: 'Starting navigation test...',
    color: '#6b7280',
  });

  useEffect(() => {
    if (done) return;

    const r = [...results];

    // Steps 0-3: Navigate through routes, check gradient on each
    if (stepIndex < ROUTES.length) {
      const route = ROUTES[stepIndex];
      const routeName = route === '/global-style-test' ? 'Home' : route.split('/').pop() || '';

      if (pathname !== route) {
        setCurrentStep({
          label: 'Navigating to ' + routeName + '...',
          color: '#0070f3',
        });
        router.push(route);
        return;
      }

      // We're on the right route — check gradient
      const tid = setTimeout(() => {
        const bg = getComputedStyle(document.body).backgroundImage;
        r.push({
          label: 'Gradient persists on ' + routeName,
          pass: bg.includes('linear-gradient'),
        });
        setResults(r);
        setStepIndex(stepIndex + 1);
      }, 400);

      setCurrentStep({
        label: 'Checking gradient on ' + routeName + '...',
        color: '#7c3aed',
      });

      return () => clearTimeout(tid);
    }

    // Step 4: Mount conditional style
    if (stepIndex === ROUTES.length) {
      setCurrentStep({ label: 'Mounting conditional global style...', color: '#d97706' });
      setShowLock(true);

      const tid = setTimeout(() => {
        const outline = getComputedStyle(document.body).outlineStyle;
        r.push({ label: 'Outline applied (mounted)', pass: outline === 'solid' });

        const overflow = getComputedStyle(document.body).overflow;
        r.push({ label: 'Scroll locked (mounted)', pass: overflow === 'hidden' });

        const bg = getComputedStyle(document.body).backgroundImage;
        r.push({ label: 'Gradient persists (mounted)', pass: bg.includes('linear-gradient') });

        setResults(r);
        setStepIndex(stepIndex + 1);
      }, 800);

      setCurrentStep({ label: 'Verifying mounted state...', color: '#dc2626' });

      return () => clearTimeout(tid);
    }

    // Step 5: Unmount conditional style
    if (stepIndex === ROUTES.length + 1) {
      setCurrentStep({ label: 'Unmounting conditional global style...', color: '#d97706' });
      setShowLock(false);

      const tid = setTimeout(() => {
        const outline = getComputedStyle(document.body).outlineStyle;
        r.push({ label: 'Outline removed (unmounted)', pass: outline === 'none' || outline === '' });

        const overflow = getComputedStyle(document.body).overflow;
        r.push({ label: 'Scroll restored (unmounted)', pass: overflow !== 'hidden' });

        setResults(r);
        setDone(true);
        setCurrentStep({ label: 'Complete', color: '#16a34a' });

        // Report results to composite summary
        const passed = r.filter(c => c.pass).length;
        window.dispatchEvent(
          new CustomEvent('sc-test-result', { detail: { passed, total: r.length } })
        );
      }, 800);

      return () => clearTimeout(tid);
    }
  }, [stepIndex, pathname, done]);

  const passed = results.filter(r => r.pass).length;

  return (
    <Card>
      <Heading>Autopilot: Navigation + Mount/Unmount</Heading>

      <PhaseBar $color={currentStep.color}>
        <PhaseDot $color={currentStep.color} $animate={!done} />
        {currentStep.label}
      </PhaseBar>

      {showLock && <BodyLockStyles />}

      {done && (
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
  transition: color 0.2s, background 0.2s, border-color 0.2s;
`;

const PhaseDot = styled.span<{ $color: string; $animate: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
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
