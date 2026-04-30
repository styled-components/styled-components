import React from 'react';
import styled, { toStyleSheet } from 'styled-components/native';
import type { RuleSet } from 'styled-components/native';
import { FeatureChip } from '@/components/FeatureChip';
import { theme as t } from '@/theme/tokens';

export interface StyleAssertion {
  /** RN style prop name (camelCase) */
  prop: string;
  /** Expected value (string or number) */
  expected: string | number;
}

export interface VerificationCase {
  label: string;
  input: RuleSet<object>;
  source: string;
  assertions: StyleAssertion[];
}

export interface WidgetCaseProps {
  title: string;
  brief: string;
  feature?: string;
  children: React.ReactNode;
  cases?: VerificationCase[];
}

const Section = styled.View`
  align-self: stretch;
  margin-bottom: ${t.space.lg}px;
`;

const Header = styled.View`
  align-self: stretch;
  gap: ${t.space.xs}px;
  margin-bottom: ${t.space.md}px;
`;

const Title = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.title}px;
  line-height: ${t.lineHeight.title}px;
  color: ${t.colors.ink};
  letter-spacing: -0.2px;
  flex-shrink: 1;
`;

const Brief = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.brief}px;
  line-height: ${t.lineHeight.brief}px;
  color: ${t.colors.fgMuted};
  flex-shrink: 1;
`;

const Demo = styled.View`
  border-top-width: ${t.borderWidth.heavy}px;
  border-bottom-width: ${t.borderWidth.heavy}px;
  border-color: ${t.colors.border};
  padding: ${t.space.lg}px 0;
  gap: ${t.space.md}px;
`;

const Verification = styled.View`
  margin-top: ${t.space.lg}px;
  gap: ${t.space.md}px;
`;

const CaseBlock = styled.View`
  gap: ${t.space.xs}px;
`;

const CaseLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgFaint};
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const Code = styled.View`
  border-left-width: ${t.borderWidth.heavy}px;
  border-left-color: ${t.colors.ink};
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: ${t.colors.signalSoft};
`;

const CodeText = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  line-height: ${t.lineHeight.mono}px;
  color: ${t.colors.ink};
`;

const StatusRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
`;

const StatusProp = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fg};
  flex: 1;
`;

const StatusBadge = styled.Text<{ $pass: boolean }>`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1.5px;
  padding: 2px 6px;
  color: ${t.colors.bg};
  background-color: ${p => (p.$pass ? t.colors.pass : t.colors.fail)};
`;

function formatValue(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (v == null) return '∅';
  return JSON.stringify(v);
}

function check(actual: Record<string, any>, a: StyleAssertion): boolean {
  const v = actual[a.prop];
  if (typeof a.expected === 'number') return v === a.expected;
  return formatValue(v) === a.expected;
}

export function WidgetCase({ title, brief, feature, children, cases }: WidgetCaseProps) {
  return (
    <Section>
      <Header>
        {feature ? <FeatureChip>{feature}</FeatureChip> : null}
        <Title>{title}</Title>
        <Brief>{brief}</Brief>
      </Header>
      <Demo>{children}</Demo>
      {cases && cases.length > 0 ? (
        <Verification>
          {cases.map(c => {
            const compiled = toStyleSheet(c.input as any);
            return (
              <CaseBlock key={c.label}>
                <CaseLabel>{c.label}</CaseLabel>
                <Code>
                  <CodeText>{c.source}</CodeText>
                </Code>
                {c.assertions.map(a => {
                  const pass = check(compiled, a);
                  const actual = formatValue(compiled[a.prop]);
                  return (
                    <StatusRow key={a.prop}>
                      <StatusProp>
                        {a.prop} → {actual}
                      </StatusProp>
                      <StatusBadge $pass={pass}>{pass ? 'OK' : 'FAIL'}</StatusBadge>
                    </StatusRow>
                  );
                })}
              </CaseBlock>
            );
          })}
        </Verification>
      ) : null}
    </Section>
  );
}
