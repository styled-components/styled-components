'use client';

import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes, useTheme } from 'styled-components';
import { TestStatus, type TestCheck } from '../components/auto-test';
import { TestSummary } from '../components/test-summary';
import { Section, SectionTitle, SectionDesc, HintText } from '../components/test-ui';

const test1Checks: TestCheck[] = [
  { ref: 'variant-card', type: 'exists', label: 'VariantCard renders' },
];

const test2Checks: TestCheck[] = [
  { ref: 'color-text', type: 'exists', label: 'ColorText renders' },
];

const test3Checks: TestCheck[] = [
  {
    ref: 'bouncing-box',
    type: 'style-not',
    prop: 'animation-name',
    expected: 'none',
    label: 'Box has animation',
  },
];

const test4Checks: TestCheck[] = [
  {
    ref: 'disabled-btn',
    type: 'attr',
    prop: 'disabled',
    expected: '',
    label: 'Button is disabled',
  },
];

const test5Checks: TestCheck[] = [
  { ref: 'undefined-as', type: 'element', expected: 'button', label: 'Renders as <button>' },
];

const test6Checks: TestCheck[] = [
  {
    ref: 'truncated-text',
    type: 'style',
    prop: 'text-overflow',
    expected: 'ellipsis',
    label: 'Text truncates',
  },
  {
    ref: 'truncated-text',
    type: 'style',
    prop: 'white-space',
    expected: 'nowrap',
    label: 'No wrap',
  },
];

const test7Checks: TestCheck[] = [
  { ref: 'swatch-primary', type: 'exists', label: 'Primary swatch renders' },
  { ref: 'swatch-success', type: 'exists', label: 'Success swatch renders' },
];

const test8Checks: TestCheck[] = [
  {
    ref: 'chained-input',
    type: 'attr',
    prop: 'data-base',
    expected: 'yes',
    label: 'Base attrs() applied',
  },
  {
    ref: 'chained-input',
    type: 'attr',
    prop: 'data-labeled',
    expected: 'yes',
    label: 'Labeled attrs() applied',
  },
  {
    ref: 'chained-input',
    type: 'attr',
    prop: 'data-validated',
    expected: 'yes',
    label: 'Validated attrs() applied',
  },
  {
    ref: 'chained-input',
    type: 'attr',
    prop: 'aria-invalid',
    expected: 'true',
    label: 'aria-invalid reflects $hasError transient',
  },
  {
    ref: 'chained-input',
    type: 'attr',
    prop: 'type',
    expected: 'text',
    label: 'type=text from base attrs',
  },
];

const test9Checks: TestCheck[] = [
  {
    ref: 'progress-bar-fixed',
    type: 'style',
    prop: 'width',
    expected: '120px',
    label: 'CSS-var transient: width resolves from --progress (60% of 200px)',
  },
];

const clientSuites = [
  { name: '1. Variants', checks: test1Checks },
  { name: '2. Transient', checks: test2Checks },
  { name: '3. Keyframes', checks: test3Checks },
  { name: '4. attrs()', checks: test4Checks },
  { name: '5. undefined as', checks: test5Checks },
  { name: '6. css helper', checks: test6Checks },
  { name: '7. Theme', checks: test7Checks },
  { name: '8. attrs chain', checks: test8Checks },
  { name: '9. CSS-var transient', checks: test9Checks },
];

const VARIANTS = ['default', 'active', 'error'] as const;
type Variant = (typeof VARIANTS)[number];

const COLORS = ['#7c3aed', '#dc2626', '#0070f3', '#16a34a', '#d97706'] as const;

/** Cycles through an array on an interval */
function useCycle<T>(items: readonly T[], ms: number): T {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % items.length), ms);
    return () => clearInterval(id);
  }, [items.length, ms]);
  return items[index];
}

/** Increments on each theme change so swatches flip to a new angle */
function useThemeFlip(): number {
  const theme = useTheme();
  const prevRef = useRef(theme);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (prevRef.current !== theme) {
      prevRef.current = theme;
      setCount(c => c + 1);
    }
  }, [theme]);

  return count;
}

export function ClientTestingHarness() {
  const variant = useCycle(VARIANTS, 1500);
  const color = useCycle(COLORS, 1200);
  const flipCount = useThemeFlip();
  const cyclingPct = useCycle([25, 75] as const, 1500);

  return (
    <Container>
      <Title>Client Component Tests</Title>
      <TestSummary suites={clientSuites} />
      <Subtitle>All dynamic tests run on autopilot. Watch for continuous changes.</Subtitle>

      {/* 1. Dynamic variant switching */}
      <Section>
        <SectionTitle>
          1. Dynamic variant styling <TestStatus checks={test1Checks} />
        </SectionTitle>
        <SectionDesc>
          The card cycles through variants automatically every 1.5s: default (surface bg) &rarr;
          active (blue bg) &rarr; error (red tint).
        </SectionDesc>
        <HintText>If broken: the card never changes appearance.</HintText>
        <VariantCard $variant={variant} data-testid="variant-card">
          Current variant: <strong>{variant}</strong>
        </VariantCard>
      </Section>

      {/* 2. Runtime color via transient prop */}
      <Section>
        <SectionTitle>
          2. Runtime color (transient prop) <TestStatus checks={test2Checks} />
        </SectionTitle>
        <SectionDesc>
          The text below cycles through 5 colors automatically every 1.2s. Uses <code>$color</code>{' '}
          transient prop (not forwarded to DOM).
        </SectionDesc>
        <HintText>
          If broken: text color is static, or an unknown-attribute DOM warning appears.
        </HintText>
        <ColorText $color={color} data-testid="color-text">
          Color: {color}
        </ColorText>
      </Section>

      {/* 3. Keyframe animation */}
      <Section>
        <SectionTitle>
          3. Keyframe animation <TestStatus checks={test3Checks} />
        </SectionTitle>
        <SectionDesc>The box should continuously bounce up and down in a loop.</SectionDesc>
        <HintText>If broken: the box is static (no movement).</HintText>
        <BouncingBox data-testid="bouncing-box" />
      </Section>

      {/* 4. attrs() behavior (#5689, #5691) */}
      <Section>
        <SectionTitle>
          4. attrs() static props <TestStatus checks={test4Checks} />
        </SectionTitle>
        <SectionDesc>
          The button gets <code>disabled</code> from{' '}
          <code>
            .attrs({'{'} disabled: true {'}'})
          </code>
          . It should be greyed out and unclickable.
        </SectionDesc>
        <HintText>If broken: the button looks normal and is clickable.</HintText>
        <DisabledButton data-testid="disabled-btn" onClick={() => alert('should not fire')}>
          Cannot click me
        </DisabledButton>
      </Section>

      {/* 5. Explicit undefined preserves prop (#5683) */}
      <Section>
        <SectionTitle>
          5. Explicit undefined override (#5683) <TestStatus checks={test5Checks} />
        </SectionTitle>
        <SectionDesc>
          Passing <code>as={'{undefined}'}</code> should render the default element (button), not
          crash.
        </SectionDesc>
        <HintText>If broken: component crashes or renders the wrong element type.</HintText>
        <UndefinedAsTest as={undefined} data-testid="undefined-as">
          Renders as default (button)
        </UndefinedAsTest>
      </Section>

      {/* 6. css helper composition */}
      <Section>
        <SectionTitle>
          6. css helper composition <TestStatus checks={test6Checks} />
        </SectionTitle>
        <SectionDesc>
          Shared style fragments via the <code>css</code> helper should compose correctly. The text
          should truncate with an ellipsis.
        </SectionDesc>
        <HintText>If broken: text wraps instead of truncating with an ellipsis.</HintText>
        <TruncatedText data-testid="truncated-text">
          This text should truncate with an ellipsis if it overflows its container width instead of
          wrapping to multiple lines.
        </TruncatedText>
      </Section>

      {/* 7. Theme switching */}
      <Section>
        <SectionTitle>
          7. Theme reactivity <TestStatus checks={test7Checks} />
        </SectionTitle>
        <SectionDesc>
          Toggle dark mode (top-right button). All four swatches should change color simultaneously.
        </SectionDesc>
        <HintText>If broken: swatches don&apos;t change when toggling dark mode.</HintText>
        <ThemeSwatches>
          <Swatch $color="primary" $flip={flipCount} data-testid="swatch-primary" />
          <Swatch $color="accent" $flip={flipCount} />
          <Swatch $color="danger" $flip={flipCount} />
          <Swatch $color="success" $flip={flipCount} data-testid="swatch-success" />
        </ThemeSwatches>
      </Section>

      {/* 8. attrs chaining (function form + transient prop dependency) */}
      <Section>
        <SectionTitle>
          8. attrs chaining <TestStatus checks={test8Checks} />
        </SectionTitle>
        <SectionDesc>
          Three-deep chain: <code>ChainedBase</code> → <code>ChainedLabeled</code> →{' '}
          <code>ChainedValidated</code>. Each level adds <code>attrs()</code> entries; the deepest
          uses the function form to read the transient <code>$hasError</code> prop and emit a
          corresponding <code>aria-invalid</code>. Each attrs layer paints a different side of the
          input - left=green (base), bottom=blue (labeled), right=orange (validated), top=red
          (aria-invalid from $hasError).
        </SectionDesc>
        <HintText>
          Visual: a fully four-sided rainbow border on the input means every layer landed. Any
          missing side = that <code>attrs()</code> didn&apos;t reach the DOM.
        </HintText>
        <ChainedValidated $hasError data-testid="chained-input" defaultValue="error state" />
      </Section>

      {/* 9. CSS custom property driven by transient input */}
      <Section>
        <SectionTitle>
          9. CSS-var-driven transient prop <TestStatus checks={test9Checks} />
        </SectionTitle>
        <SectionDesc>
          The progress bar reads <code>var(--progress)</code> from the element&apos;s inline{' '}
          <code>style</code>. Updating the var doesn&apos;t allocate a new className, so cycling is
          cheap. Top bar cycles 25% ↔ 75%; bottom bar is fixed at 60% for assertion (= 120px out of
          200px track).
        </SectionDesc>
        <HintText>
          If broken: the bottom bar has zero or full width (var didn&apos;t resolve), or the top bar
          doesn&apos;t move.
        </HintText>
        <ProgressColumn>
          <ProgressLabel>Cycling 25% ↔ 75%:</ProgressLabel>
          <ProgressTrack>
            <ProgressBar style={{ '--progress': cyclingPct + '%' } as React.CSSProperties} />
          </ProgressTrack>
          <ProgressLabel>Fixed 60% (asserted):</ProgressLabel>
          <ProgressTrack>
            <ProgressBar
              data-testid="progress-bar-fixed"
              style={{ '--progress': '60%' } as React.CSSProperties}
            />
          </ProgressTrack>
        </ProgressColumn>
      </Section>
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
`;

const Container = styled.div``;

const Title = styled.h1`
  color: ${p => p.theme.colors.text};
  font-size: 32px;
  margin-bottom: 8px;
  margin-top: 48px;
`;

const Subtitle = styled.p`
  color: ${p => p.theme.colors.textMuted};
  font-size: 14px;
  margin-bottom: 32px;
`;

const VariantCard = styled.div<{ $variant: Variant }>`
  padding: 24px;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;

  ${p =>
    p.$variant === 'active'
      ? css`
          background: ${p.theme.colors.primary};
          color: white;
          border: 1px solid ${p.theme.colors.primary};
        `
      : p.$variant === 'error'
        ? css`
            background: ${p.theme.colors.danger}15;
            color: ${p.theme.colors.danger};
            border: 1px solid ${p.theme.colors.danger};
          `
        : css`
            background: ${p.theme.colors.surface};
            color: ${p.theme.colors.text};
            border: 1px solid ${p.theme.colors.border};
          `}
`;

const ColorText = styled.p<{ $color: string }>`
  color: ${p => p.$color};
  font-size: 24px;
  font-weight: 700;
  font-family: monospace;
  transition: color 0.3s;
`;

const BouncingBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${p => p.theme.colors.primary};
  animation: ${bounce} 1s ease-in-out infinite;
`;

const DisabledButton = styled.button.attrs({ disabled: true })`
  padding: 10px 20px;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 6px;
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.textMuted};
  font-size: 14px;
  cursor: not-allowed;
  opacity: 0.6;
`;

const UndefinedAsTest = styled.button`
  padding: 10px 20px;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 6px;
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  font-size: 14px;
  cursor: pointer;
`;

const truncate = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TruncatedText = styled.p`
  ${truncate}
  max-width: 300px;
  font-size: 14px;
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  padding: 16px;
`;

const ThemeSwatches = styled.div`
  display: flex;
  gap: 16px;
`;

/**
 * Swatch colors are intentionally polar opposites between light/dark
 * so the theme reactivity test produces a dramatic, unmistakable shift.
 * These are separate from the main theme colors used by the rest of the UI.
 */
const swatchColors = {
  light: { primary: '#0070f3', accent: '#7c3aed', danger: '#dc2626', success: '#16a34a' },
  dark: { primary: '#f97316', accent: '#eab308', danger: '#06b6d4', success: '#ec4899' },
};

const Swatch = styled.div<{
  $color: 'primary' | 'accent' | 'danger' | 'success';
  $flip: number;
}>`
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: ${p => swatchColors.light[p.$color]};
  transition:
    background 0.6s,
    transform 0.6s;
  transform: perspective(400px) rotateY(${p => p.$flip * 180}deg);

  @media (prefers-color-scheme: dark) {
    background: ${p => swatchColors.dark[p.$color]};
  }

  .dark & {
    background: ${p => swatchColors.dark[p.$color]};
  }

  .light & {
    background: ${p => swatchColors.light[p.$color]};
  }

  &:nth-child(2) {
    transition-delay: 0.05s;
  }
  &:nth-child(3) {
    transition-delay: 0.1s;
  }
  &:nth-child(4) {
    transition-delay: 0.15s;
  }
`;

// ---------------------------------------------------------------------------
// 8. attrs chaining (function form + transient prop dependency)
// ---------------------------------------------------------------------------

/**
 * Each attrs() layer earns its own visible side of the input via attribute
 * selectors so a missing layer leaves that side gray.
 *   left  = #16a34a   data-base="yes"          (base)
 *   bottom= #2563eb   data-labeled="yes"       (labeled)
 *   right = #d97706   data-validated="yes"     (validated)
 *   top   = #dc2626   aria-invalid="true"      (function-form attrs reading $hasError)
 */
const ChainedBase = styled.input.attrs({
  type: 'text',
  'data-base': 'yes',
})`
  padding: 10px 14px;
  border: 2px solid ${p => p.theme.colors.border};
  border-radius: 6px;
  font-size: 14px;
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
  width: 320px;
  box-sizing: border-box;

  &[data-base='yes'] {
    border-left: 6px solid #16a34a;
  }
`;

const ChainedLabeled = styled(ChainedBase).attrs({
  autoComplete: 'off',
  spellCheck: false,
  'data-labeled': 'yes',
})`
  letter-spacing: 0.02em;

  &[data-labeled='yes'] {
    border-bottom: 6px solid #2563eb;
  }
`;

const ChainedValidated = styled(ChainedLabeled).attrs<{ $hasError?: boolean }>(p => ({
  'aria-invalid': p.$hasError ? 'true' : 'false',
  'data-validated': 'yes',
}))`
  &[data-validated='yes'] {
    border-right: 6px solid #d97706;
  }

  &[aria-invalid='true'] {
    border-top: 6px solid #dc2626;
  }
`;

// ---------------------------------------------------------------------------
// 9. CSS custom property driven by transient input
// ---------------------------------------------------------------------------

const ProgressColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProgressLabel = styled.span`
  font-size: 12px;
  color: ${p => p.theme.colors.textMuted};
`;

const ProgressTrack = styled.div`
  /* override the BaseStyle border-box reset so 60% of width = 120px exactly */
  box-sizing: content-box;
  width: 200px;
  height: 16px;
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

const ProgressBar = styled.div`
  height: 100%;
  width: var(--progress, 0%);
  background: ${p => p.theme.colors.primary};
  transition: width 0.6s ease;
`;
