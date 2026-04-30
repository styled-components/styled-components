import React, { useState } from 'react';
import styled, { css } from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import type { VerificationCase } from '@/components/WidgetCase';
import { theme as t } from '@/theme/tokens';

const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.xs}px;
`;

const Pill = styled.Pressable`
  padding: 8px 14px;
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.heavy}px solid ${t.colors.ink};

  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
    border-color: ${t.colors.ink};
  }

  &[data-variant='ghost'] {
    background-color: transparent;
    border-color: transparent;
  }

  &[data-variant='ghost'][aria-pressed='true'] {
    background-color: ${t.colors.ink};
    border-color: ${t.colors.ink};
  }

  &[data-size='lg'] {
    padding: 12px 20px;
  }
`;

const PillLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: 12px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${t.colors.ink};

  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }

  &[data-variant='ghost'] {
    color: ${t.colors.fgMuted};
  }

  &[data-variant='ghost'][aria-pressed='true'] {
    color: ${t.colors.bg};
  }

  &[data-size='lg'] {
    font-size: 14px;
  }
`;

const Group = styled.View`
  gap: ${t.space.xs}px;
`;

const GroupHeading = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgFaint};
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const FILTERS = ['All', 'Active', 'Archived', 'Draft'];

export function AttributeVariants() {
  const [active, setActive] = useState('All');
  return (
    <Stack>
      <StateReadout
        entries={[
          { key: 'aria-pressed', value: `'true' on "${active}", 'false' on others` },
          { key: 'rules', value: `&[aria-pressed='true'], &[data-variant='ghost']` },
        ]}
        badge={{ tone: 'pass', label: `ACTIVE · ${active.toUpperCase()}` }}
      />
      <Group>
        <GroupHeading>Solid · default</GroupHeading>
        <Row>
          {FILTERS.map(f => (
            <Pill
              key={f}
              aria-pressed={active === f}
              onPress={() => setActive(f)}
              accessibilityRole="button"
            >
              <PillLabel aria-pressed={active === f}>{f}</PillLabel>
            </Pill>
          ))}
        </Row>
      </Group>
      <Group>
        <GroupHeading>Ghost · large</GroupHeading>
        <Row>
          {FILTERS.map(f => (
            <Pill
              key={f}
              data-variant="ghost"
              data-size="lg"
              aria-pressed={active === f}
              onPress={() => setActive(f)}
              accessibilityRole="button"
            >
              <PillLabel
                data-variant="ghost"
                data-size="lg"
                aria-pressed={active === f}
              >
                {f}
              </PillLabel>
            </Pill>
          ))}
        </Row>
      </Group>
    </Stack>
  );
}

export const attributeVariantsCases: VerificationCase[] = [
  {
    label: 'Pill — pressed',
    source: `padding: 8px 14px;
background-color: #0e0e10;
border: 2px solid #0e0e10;`,
    input: css`
      padding: 8px 14px;
      background-color: #0e0e10;
      border: 2px solid #0e0e10;
    `,
    assertions: [
      { prop: 'paddingTop', expected: 8 },
      { prop: 'paddingLeft', expected: 14 },
      { prop: 'backgroundColor', expected: '#0e0e10' },
      { prop: 'borderTopWidth', expected: 2 },
    ],
  },
  {
    label: 'Pill — ghost large',
    source: `padding: 12px 20px;
background-color: transparent;
border: 2px solid transparent;`,
    input: css`
      padding: 12px 20px;
      background-color: transparent;
      border: 2px solid transparent;
    `,
    assertions: [
      { prop: 'paddingTop', expected: 12 },
      { prop: 'paddingLeft', expected: 20 },
      { prop: 'backgroundColor', expected: 'transparent' },
      { prop: 'borderTopColor', expected: 'transparent' },
    ],
  },
];
