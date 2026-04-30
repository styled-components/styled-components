import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Mono key-value state lines with a tri-state badge: PASS / FAIL / NEUTRAL.
 * The visual goal is a quiet log-line readout that sits above each demo
 * spelling out current state, the rule under test, and whether it matches.
 */

const Wrap = styled.View`
  gap: ${t.space.xxs}px;
`;

const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${t.space.xs}px;
`;

const KeyText = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  line-height: ${t.lineHeight.mono}px;
  color: ${t.colors.fgFaint};
`;

const ValText = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.mono}px;
  line-height: ${t.lineHeight.mono}px;
  color: ${t.colors.ink};
`;

const Badge = styled.Text<{ $tone: 'pass' | 'fail' | 'neutral' }>`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1.5px;
  padding: 2px 6px;
  align-self: flex-start;
  color: ${t.colors.bg};
  background-color: ${p =>
    p.$tone === 'pass' ? t.colors.pass : p.$tone === 'fail' ? t.colors.fail : t.colors.ink};
`;

export interface ReadoutEntry {
  /** Mono label, lowercase. */
  key: string;
  /** Live value, mono strong. */
  value: string | number;
}

interface Props {
  entries: ReadoutEntry[];
  /** Optional tri-state badge — e.g. "MATCH · row layout" / "MISS · column layout". */
  badge?: { tone: 'pass' | 'fail' | 'neutral'; label: string };
}

export function StateReadout({ entries, badge }: Props) {
  return (
    <Wrap>
      {entries.map(e => (
        <Row key={e.key}>
          <KeyText>{e.key}</KeyText>
          <ValText>{e.value}</ValText>
        </Row>
      ))}
      {badge ? <Badge $tone={badge.tone}>{badge.label}</Badge> : null}
    </Wrap>
  );
}
