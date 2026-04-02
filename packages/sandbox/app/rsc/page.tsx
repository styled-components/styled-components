import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { TestStatus, type TestCheck } from '../components/auto-test';
import { TestSummary } from '../components/test-summary';
import BackLink from '../components/back-link';
import ClientButton from '../components/client-button';
import {
  Section,
  SectionTitle,
  SectionDesc,
  HintText,
  Demo,
  Row,
  Column,
  ColumnLabel,
  Code,
} from '../components/test-ui';
import theme from '../lib/theme';

const test1Checks: TestCheck[] = [
  {
    ref: 'card-a',
    type: 'style',
    prop: 'border-left-color',
    expectedVar: '--sc-colors-primary',
    label: 'CardA primary border',
  },
  {
    ref: 'card-b',
    type: 'style',
    prop: 'border-left-color',
    expectedVar: '--sc-colors-accent',
    label: 'CardB accent border',
  },
  { ref: 'card-c', type: 'style', prop: 'font-style', expected: 'italic', label: 'CardC italic' },
];

const test2Checks: TestCheck[] = [
  {
    ref: 'danger-btn',
    type: 'style',
    prop: 'background-color',
    expected: 'rgb(220, 38, 38)',
    label: 'DangerButton bg red',
  },
  {
    ref: 'outline-btn',
    type: 'style',
    prop: 'background-color',
    expected: 'rgba(0, 0, 0, 0)',
    label: 'OutlineButton bg transparent',
  },
  {
    ref: 'large-btn',
    type: 'style',
    prop: 'font-size',
    expected: '20px',
    label: 'LargeButton font-size 20px',
  },
];

const test3Checks: TestCheck[] = [
  {
    ref: 'base-box',
    type: 'style-not',
    prop: 'background-color',
    expected: 'rgba(0, 0, 0, 0)',
    label: 'BaseBox has bg',
  },
  {
    ref: 'accent-box',
    type: 'style-not',
    prop: 'background-color',
    expected: 'rgba(0, 0, 0, 0)',
    label: 'AccentBox has bg',
  },
  {
    ref: 'compact-box',
    type: 'style',
    prop: 'font-size',
    expected: '12px',
    label: 'CompactBox small text',
  },
];

const test4Checks: TestCheck[] = [
  {
    ref: 'pulsing-dot',
    type: 'style-not',
    prop: 'animation-name',
    expected: 'none',
    label: 'PulsingDot has animation',
  },
];

const test5Checks: TestCheck[] = [
  {
    ref: 'badge-ok',
    type: 'style-not',
    prop: 'background-color',
    expected: 'rgba(0, 0, 0, 0)',
    label: 'OK badge has bg',
  },
  {
    ref: 'badge-warn',
    type: 'style-not',
    prop: 'background-color',
    expected: 'rgba(0, 0, 0, 0)',
    label: 'Warn badge has bg',
  },
  {
    ref: 'badge-error',
    type: 'style-not',
    prop: 'background-color',
    expected: 'rgba(0, 0, 0, 0)',
    label: 'Error badge has bg',
  },
];

const test6Checks: TestCheck[] = [
  { ref: 'as-default', type: 'element', expected: 'p', label: 'Default renders <p>' },
  { ref: 'as-link', type: 'element', expected: 'a', label: 'Link renders <a>' },
  { ref: 'as-button', type: 'element', expected: 'button', label: 'Button renders <button>' },
];

const test7Checks: TestCheck[] = [
  {
    ref: 'var-card',
    type: 'style',
    prop: 'border-color',
    expectedVar: '--sc-colors-primary',
    label: 'VarCard uses CSS var for border',
  },
];

const test8Checks: TestCheck[] = [
  {
    ref: 'nth-first',
    type: 'style',
    prop: 'color',
    expected: 'rgb(220, 38, 38)',
    label: ':first-of-type item is red',
  },
  {
    ref: 'nth-last',
    type: 'style',
    prop: 'color',
    expected: 'rgb(37, 99, 235)',
    label: ':last-of-type item is blue',
  },
  {
    ref: 'nth-second',
    type: 'style',
    prop: 'color',
    expected: 'rgb(22, 163, 74)',
    label: ':nth-of-type(2) item is green',
  },
  {
    ref: 'nthchild-first',
    type: 'style',
    prop: 'color',
    expected: 'rgb(220, 38, 38)',
    label: ':first-child item is red (plugin fix)',
  },
  {
    ref: 'nthchild-last',
    type: 'style',
    prop: 'color',
    expected: 'rgb(37, 99, 235)',
    label: ':last-child item is blue (plugin fix)',
  },
  {
    ref: 'nthchild-second',
    type: 'style',
    prop: 'color',
    expected: 'rgb(22, 163, 74)',
    label: ':nth-child(2) item is green (plugin fix)',
  },
];

const test9Checks: TestCheck[] = [
  {
    ref: 'dedup-marker',
    type: 'style',
    prop: 'border-style',
    expected: 'dashed',
    label: 'Dedup marker has dashed border',
  },
];

const rscSuites = [
  { name: '1. Module-level', checks: test1Checks },
  { name: '2. Cross-boundary', checks: test2Checks },
  { name: '3. RSC-extends-RSC', checks: test3Checks },
  { name: '4. Keyframes', checks: test4Checks },
  { name: '5. Dynamic props', checks: test5Checks },
  { name: '6. as prop', checks: test6Checks },
  { name: '7. CSS vars', checks: test7Checks },
  { name: '8. Child-index selectors', checks: test8Checks },
  { name: '9. GlobalStyle dedup', checks: test9Checks },
];

export default function RSCTestPage() {
  return (
    <Container>
      <BackLink />
      <Title>RSC Integration Tests</Title>
      <TestSummary suites={rscSuites} />

      {/* 1. Module-level components */}
      <Section>
        <SectionTitle>
          1. Module-level styled components <TestStatus checks={test1Checks} />
        </SectionTitle>
        <SectionDesc>
          Styled components defined at module scope in an RSC file should render without triggering
          false &quot;created dynamically&quot; console warnings.
        </SectionDesc>
        <HintText>
          If broken: the three cards below are unstyled (no background, no border, no padding)
          because the component definitions were rejected.
        </HintText>
        <Demo>
          <Row>
            <CardA data-testid="card-a">
              <RSCCardTitle>Card A</RSCCardTitle>
              <p>Blue left border — base card style.</p>
            </CardA>
            <CardB data-testid="card-b">
              <RSCCardTitle>Card B</RSCCardTitle>
              <p>Purple left border — second variant.</p>
            </CardB>
            <CardC data-testid="card-c">
              <RSCCardTitle>Card C</RSCCardTitle>
              <p>Green left border, italic text — third variant.</p>
            </CardC>
          </Row>
        </Demo>
      </Section>

      {/* 2. Cross-boundary specificity (#5672) */}
      <Section>
        <SectionTitle>
          2. Cross-boundary specificity (#5672) <TestStatus checks={test2Checks} />
        </SectionTitle>
        <SectionDesc>
          Server components extending a client component via <Code>styled(ClientButton)</Code>. The
          extended styles must override the base client styles despite being injected into different{' '}
          <Code>&lt;style&gt;</Code> tags.
        </SectionDesc>
        <HintText>
          If broken: DangerButton appears blue (not red), OutlineButton appears as a filled blue
          button (not transparent), or LargeButton is the same size as the base button. All four
          buttons looking identical = bug.
        </HintText>
        <Demo>
          <Row>
            <Column>
              <ColumnLabel>Base (client-defined, blue):</ColumnLabel>
              <ClientButton>Base</ClientButton>
            </Column>
            <Column>
              <ColumnLabel>
                <Code>styled(ClientButton)</Code> &rarr; red:
              </ColumnLabel>
              <DangerButton data-testid="danger-btn">Danger</DangerButton>
            </Column>
            <Column>
              <ColumnLabel>
                <Code>styled(ClientButton)</Code> &rarr; outline:
              </ColumnLabel>
              <OutlineButton data-testid="outline-btn">Outline</OutlineButton>
            </Column>
            <Column>
              <ColumnLabel>
                <Code>styled(ClientButton)</Code> &rarr; large:
              </ColumnLabel>
              <LargeButton data-testid="large-btn">Large</LargeButton>
            </Column>
          </Row>
        </Demo>
      </Section>

      {/* 3. RSC-extends-RSC */}
      <Section>
        <SectionTitle>
          3. RSC-extends-RSC inheritance chain <TestStatus checks={test3Checks} />
        </SectionTitle>
        <SectionDesc>
          A three-level inheritance chain where all components are server-defined:{' '}
          <Code>BaseBox</Code> &rarr; <Code>AccentBox</Code> &rarr; <Code>CompactAccentBox</Code>.
          Each level should progressively override.
        </SectionDesc>
        <HintText>
          If broken: all three boxes look identical (same color, same padding), or extended styles
          are missing entirely.
        </HintText>
        <Demo>
          <Row>
            <Column>
              <ColumnLabel>BaseBox (blue bg, 16px pad):</ColumnLabel>
              <BaseBox data-testid="base-box">Base — blue background, standard padding</BaseBox>
            </Column>
            <Column>
              <ColumnLabel>AccentBox (orange bg):</ColumnLabel>
              <AccentBox data-testid="accent-box">
                Accent — orange background, inherited padding
              </AccentBox>
            </Column>
            <Column>
              <ColumnLabel>CompactAccentBox (small):</ColumnLabel>
              <CompactAccentBox data-testid="compact-box">
                Compact — orange bg, smaller padding + text
              </CompactAccentBox>
            </Column>
          </Row>
        </Demo>
      </Section>

      {/* 4. Keyframes in RSC */}
      <Section>
        <SectionTitle>
          4. Keyframes in RSC <TestStatus checks={test4Checks} />
        </SectionTitle>
        <SectionDesc>
          Keyframe animations defined and referenced in server components. The{' '}
          <Code>keyframes</Code> helper registers the animation eagerly so it&apos;s available when
          the component renders.
        </SectionDesc>
        <HintText>
          If broken: the green dot is static (no pulsing animation), or the animation name is
          missing from the generated CSS.
        </HintText>
        <Demo>
          <PulseRow>
            <PulsingDot data-testid="pulsing-dot" />
            <PulseLabel>
              This dot should pulse continuously (opacity 1 &rarr; 0 &rarr; 1)
            </PulseLabel>
          </PulseRow>
        </Demo>
      </Section>

      {/* 5. Dynamic props */}
      <Section>
        <SectionTitle>
          5. Dynamic props in RSC <TestStatus checks={test5Checks} />
        </SectionTitle>
        <SectionDesc>
          Transient props (<Code>$status</Code>) driving conditional styles at server render time.
          Each prop value produces a unique class name.
        </SectionDesc>
        <HintText>
          If broken: all three badges are the same color, or the styles don&apos;t match the status
          value.
        </HintText>
        <Demo>
          <Row>
            <StatusBadge $status="ok" data-testid="badge-ok">
              OK
            </StatusBadge>
            <StatusBadge $status="warn" data-testid="badge-warn">
              Warning
            </StatusBadge>
            <StatusBadge $status="error" data-testid="badge-error">
              Error
            </StatusBadge>
          </Row>
        </Demo>
      </Section>

      {/* 6. `as` prop */}
      <Section>
        <SectionTitle>
          6. Polymorphic <Code>as</Code> prop in RSC <TestStatus checks={test6Checks} />
        </SectionTitle>
        <SectionDesc>
          The <Code>as</Code> prop changes the rendered HTML element while keeping the same styles.
          The link below should be hoverable/clickable, and the button should look like a button
          (with browser default button affordance).
        </SectionDesc>
        <HintText>
          If broken: the link is not clickable, the button has no button affordance, or styles are
          lost when using <Code>as</Code>.
        </HintText>
        <Demo>
          <AsRow>
            <AsBlock data-testid="as-default">
              <AsLabel>&lt;p&gt;</AsLabel>
              Default paragraph
            </AsBlock>
            <AsBlock
              as="a"
              href="#"
              data-testid="as-link"
              style={{
                borderColor: '#0070f3',
                color: '#0070f3',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              <AsLabel>&lt;a&gt;</AsLabel>
              Clickable link &rarr;
            </AsBlock>
            <AsButton as="button" data-testid="as-button">
              <AsLabel style={{ color: 'rgba(255,255,255,0.7)' }}>&lt;button&gt;</AsLabel>
              Button element
            </AsButton>
          </AsRow>
        </Demo>
      </Section>

      {/* 7. CSS variable theming */}
      <Section>
        <SectionTitle>
          7. CSS variable theming for RSC <TestStatus checks={test7Checks} />
        </SectionTitle>
        <SectionDesc>
          RSC components can&apos;t access React context (no <Code>useContext</Code>), so{' '}
          <Code>ThemeProvider</Code> values aren&apos;t available at server render time. The
          solution: emit theme tokens as CSS custom properties on <Code>:root</Code> via{' '}
          <Code>createGlobalStyle</Code>, then reference them with <Code>var(--sc-*)</Code> in RSC
          styled components. Toggle dark mode to see these update.
        </SectionDesc>
        <HintText>
          If broken: the card below doesn&apos;t change when you toggle dark mode, or the colors
          don&apos;t match the rest of the page.
        </HintText>
        <Demo>
          <VarCard data-testid="var-card">
            <VarTitle>Theme-synced RSC card</VarTitle>
            <VarText>
              This card uses <Code>var(--sc-primary)</Code>, <Code>var(--sc-surface)</Code>, and{' '}
              <Code>var(--sc-text-muted)</Code> &mdash; all injected by the root{' '}
              <Code>createGlobalStyle</Code>. Toggle dark mode to see it update without any client
              JS in this component.
            </VarText>
            <VarBadge>var(--sc-accent)</VarBadge>
          </VarCard>
        </Demo>
      </Section>
      {/* 8. Child-index selectors in RSC */}
      <Section>
        <SectionTitle>
          8. Child-index selectors in RSC <TestStatus checks={test8Checks} />
        </SectionTitle>
        <SectionDesc>
          RSC emits inline <Code>&lt;style&gt;</Code> tags as siblings of the styled element. These
          tags are real DOM children, so <Code>:first-child</Code>, <Code>:last-child</Code>, and{' '}
          <Code>:nth-child()</Code> would normally count them and produce wrong results. This page
          uses <Code>stylisPluginRSC</Code> via <Code>StyleSheetManager</Code> to rewrite these
          selectors automatically. Both columns should match.
        </SectionDesc>
        <HintText>
          If broken: the <Code>:nth-child</Code> column colors don&apos;t match the{' '}
          <Code>:nth-of-type</Code> column. Inspect the DOM to see the{' '}
          <Code>&lt;style data-styled&gt;</Code> tag before the list items.
        </HintText>
        <Demo>
          <Row>
            <Column>
              <ColumnLabel>
                <Code>:nth-child</Code> (fixed by plugin):
              </ColumnLabel>
              <NthDemoList>
                <NthChildItem data-testid="nthchild-first">First (should be red)</NthChildItem>
                <NthChildItem data-testid="nthchild-second">Second (should be green)</NthChildItem>
                <NthChildItem data-testid="nthchild-last">Third (should be blue)</NthChildItem>
              </NthDemoList>
            </Column>
            <Column>
              <ColumnLabel>
                <Code>:nth-of-type</Code> (naturally safe):
              </ColumnLabel>
              <NthDemoList>
                <NthItem data-testid="nth-first">First (should be red)</NthItem>
                <NthItem data-testid="nth-second">Second (should be green)</NthItem>
                <NthItem data-testid="nth-last">Third (should be blue)</NthItem>
              </NthDemoList>
            </Column>
          </Row>
        </Demo>
      </Section>

      {/* 9. GlobalStyle dedup in RSC */}
      <Section>
        <SectionTitle>
          9. GlobalStyle dedup in RSC <TestStatus checks={test9Checks} />
        </SectionTitle>
        <SectionDesc>
          Multiple instances of the same static <Code>createGlobalStyle</Code> in one RSC render
          should emit only one <Code>&lt;style&gt;</Code> tag (identical CSS is deduped via{' '}
          <Code>React.cache</Code>). Inspect the HTML source to verify only one{' '}
          <Code>data-styled-global=&quot;{DedupGlobalStyle.styledComponentId}&quot;</Code> tag exists.
        </SectionDesc>
        <HintText>
          If broken: you&apos;ll see multiple identical <Code>&lt;style data-styled-global&gt;</Code>{' '}
          tags in the page source. The visual test below just confirms the global style applied.
        </HintText>
        <DedupGlobalStyle />
        <DedupGlobalStyle />
        <DedupGlobalStyle />
        <Demo>
          <DedupMarker data-testid="dedup-marker">
            This box has a dashed border from <Code>DedupGlobalStyle</Code>. Check page source — the
            global style tag should appear only once despite three{' '}
            <Code>&lt;DedupGlobalStyle /&gt;</Code> instances above.
          </DedupMarker>
        </Demo>
      </Section>
    </Container>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const Title = styled.h1`
  color: ${theme.colors.text};
  font-size: 32px;
  margin-bottom: 8px;
`;

// ---------------------------------------------------------------------------
// 1. Module-level RSC components
// ---------------------------------------------------------------------------

const RSCCardBase = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  padding: 24px;
  flex: 1;
  min-width: 180px;
`;

const CardA = styled(RSCCardBase)`
  border-left-width: 4px;
  border-left-color: ${theme.colors.primary};
`;

const CardB = styled(RSCCardBase)`
  border-left-width: 4px;
  border-left-color: ${theme.colors.accent};
`;

const CardC = styled(RSCCardBase)`
  border-left-width: 4px;
  border-left-color: ${theme.colors.success};
  font-style: italic;
`;

const RSCCardTitle = styled.h3`
  color: ${theme.colors.text};
  font-size: 16px;
  margin-bottom: 8px;
`;

// ---------------------------------------------------------------------------
// 2. Cross-boundary specificity (#5672)
// ---------------------------------------------------------------------------

const DangerButton = styled(ClientButton)`
  background: #dc2626;
  border-color: #dc2626;

  &:hover {
    background: #b91c1c;
    border-color: #b91c1c;
  }
`;

const OutlineButton = styled(ClientButton)`
  background: transparent;
  color: ${theme.colors.primary};

  &:hover {
    background: ${theme.colors.primary};
    color: white;
  }
`;

const LargeButton = styled(ClientButton)`
  padding: 16px 40px;
  font-size: 20px;
  border-radius: 8px;
`;

// ---------------------------------------------------------------------------
// 3. RSC-extends-RSC inheritance chain
// ---------------------------------------------------------------------------

const BaseBox = styled.div`
  padding: 16px;
  background: color-mix(in srgb, ${theme.colors.primary} 15%, ${theme.colors.background});
  border: 2px solid color-mix(in srgb, ${theme.colors.primary} 40%, ${theme.colors.border});
  border-radius: 8px;
  font-size: 14px;
  color: ${theme.colors.text};
`;

const AccentBox = styled(BaseBox)`
  background: color-mix(in srgb, ${theme.colors.warning} 15%, ${theme.colors.background});
  border-color: color-mix(in srgb, ${theme.colors.warning} 50%, ${theme.colors.border});
`;

const CompactAccentBox = styled(AccentBox)`
  padding: 8px 12px;
  font-size: 12px;
  border-radius: 4px;
`;

// ---------------------------------------------------------------------------
// 4. Keyframes in RSC
// ---------------------------------------------------------------------------

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const PulseRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PulsingDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${theme.colors.success};
  animation: ${pulse} 2s ease-in-out infinite;
  flex-shrink: 0;
`;

const PulseLabel = styled.span`
  font-size: 14px;
  color: ${theme.colors.text};
`;

// ---------------------------------------------------------------------------
// 5. Dynamic props in RSC
// ---------------------------------------------------------------------------

const statusColor = {
  ok: theme.colors.success,
  warn: theme.colors.warning,
  error: theme.colors.danger,
};

const StatusBadge = styled.span<{ $status: 'ok' | 'warn' | 'error' }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => `color-mix(in srgb, ${statusColor[p.$status]} 20%, ${theme.colors.background})`};
  color: ${p => statusColor[p.$status]};
`;

// ---------------------------------------------------------------------------
// 6. `as` prop in RSC
// ---------------------------------------------------------------------------

const AsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;
`;

const AsBlock = styled.p`
  color: ${theme.colors.text};
  background: ${theme.colors.background};
  border: 2px solid ${theme.colors.border};
  border-radius: 8px;
  padding: 16px 24px;
  font-size: 14px;
  text-decoration: none;
  cursor: default;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
`;

const AsLabel = styled.span`
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.textMuted};
  letter-spacing: 0.5px;
`;

const AsButton = styled(AsBlock)`
  background: ${theme.colors.accent};
  border-color: ${theme.colors.accent};
  color: white;
  cursor: pointer;
  font-weight: 600;
  align-items: center;
  border-radius: 8px;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }

  &:active {
    opacity: 0.7;
  }
`;

// ---------------------------------------------------------------------------
// 7. CSS variable theming
// ---------------------------------------------------------------------------

const VarCard = styled.div`
  background: ${theme.colors.surface};
  border: 2px solid ${theme.colors.primary};
  border-radius: 8px;
  padding: 24px;
`;

const VarTitle = styled.h3`
  color: ${theme.colors.primary};
  font-size: 18px;
  margin-bottom: 8px;
`;

const VarText = styled.p`
  color: ${theme.colors.textMuted};
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
`;

const VarBadge = styled.span`
  display: inline-block;
  background: ${theme.colors.accent};
  color: white;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
`;

// ---------------------------------------------------------------------------
// 8. Child-index selectors in RSC
// ---------------------------------------------------------------------------

const NthDemoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NthBaseItem = styled.li`
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  color: ${theme.colors.text};
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.border};
`;

const NthItem = styled(NthBaseItem)`
  &:first-of-type {
    color: #dc2626;
    border-color: #dc2626;
  }
  &:nth-of-type(2) {
    color: #16a34a;
    border-color: #16a34a;
  }
  &:last-of-type {
    color: #2563eb;
    border-color: #2563eb;
  }
`;

const NthChildItem = styled(NthBaseItem)`
  &:first-child {
    color: #dc2626;
    border-color: #dc2626;
  }
  &:nth-child(2) {
    color: #16a34a;
    border-color: #16a34a;
  }
  &:last-child {
    color: #2563eb;
    border-color: #2563eb;
  }
`;

// ---------------------------------------------------------------------------
// 9. GlobalStyle dedup
// ---------------------------------------------------------------------------

const DedupGlobalStyle = createGlobalStyle`
  [data-testid="dedup-marker"] {
    border-style: dashed !important;
  }
`;

const DedupMarker = styled.div`
  padding: 16px;
  border: 2px solid ${theme.colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${theme.colors.text};
`;
