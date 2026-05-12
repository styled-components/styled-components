import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown, Markdown } from '@/components/Markdown';

/**
 * CSS Selectors 4 §15 (sibling combinators) + §9 (tree-structural
 * pseudo-classes). Each row places styled siblings inside a styled
 * parent so the per-child sibling context is published; the probes
 * read it through real CSS rules. A matched probe both fills with the
 * MATCH color AND grows tall — pairing color and height so the row
 * reads as an unmissable stair-step of matches.
 */

const OFF = 'light-dark(#d4d4d8, #3f3f46)';
const MATCH = 'light-dark(#ec4899, #f9a8d4)';
const MARKER_COLOR = 'light-dark(#0e0e10, #f5f3ee)';

const Stack = styled.View`
  gap: ${t.space.lg}px;
`;

const Section = styled.View`
  gap: ${t.space.sm}px;
`;

const SectionTitle = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.brief}px;
  color: ${t.colors.ink};
  letter-spacing: -0.2px;
`;

const RowGroup = styled.View`
  gap: ${t.space.md}px;
`;

const LabeledRow = styled.View`
  gap: ${t.space.xs}px;
`;

const ProbeRow = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: ${t.space.xs}px;
`;

const Legend = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.sm}px;
`;

const LegendItem = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.xs}px;
`;

const LegendSwatch = styled.View<{ $color: string; $square?: boolean }>`
  width: ${p => (p.$square ? 16 : 22)}px;
  height: 16px;
  background-color: ${p => p.$color};
`;

const LegendText = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  color: ${t.colors.fg};
`;

// Marker — visually distinct catalyst (square + ink color). Its presence
// makes the AdjacentProbe immediately to its right fill MATCH via
// `${Marker} + &`. Square shape vs bar shape keeps it readable as the
// "trigger" at a glance.
const Marker = styled.View`
  width: 24px;
  height: 24px;
  background-color: ${MARKER_COLOR};
`;

// Adjacent sibling probe: muted short bar by default; fills MATCH and
// grows tall when its immediately preceding styled sibling is a Marker.
const AdjacentProbe = styled.View`
  width: 80px;
  height: 16px;
  background-color: ${OFF};
  ${Marker} + & {
    height: 48px;
    background-color: ${MATCH};
  }
`;

// General sibling probe: fills MATCH when ANY prior styled sibling is a Marker.
const GeneralProbe = styled.View`
  width: 80px;
  height: 16px;
  background-color: ${OFF};
  ${Marker} ~ & {
    height: 48px;
    background-color: ${MATCH};
  }
`;

const PosProbe = styled.View`
  flex: 1;
  height: 16px;
  background-color: ${OFF};
  &:first-child {
    height: 48px;
    background-color: ${MATCH};
  }
`;
const LastProbe = styled.View`
  flex: 1;
  height: 16px;
  background-color: ${OFF};
  &:last-child {
    height: 48px;
    background-color: ${MATCH};
  }
`;
const OddProbe = styled.View`
  flex: 1;
  height: 16px;
  background-color: ${OFF};
  &:nth-child(odd) {
    height: 48px;
    background-color: ${MATCH};
  }
`;
const Nth2Probe = styled.View`
  flex: 1;
  height: 16px;
  background-color: ${OFF};
  &:nth-child(2) {
    height: 48px;
    background-color: ${MATCH};
  }
`;
// :nth-of-type — fires on the first View among mixed View + Text siblings.
const TypeProbe = styled.View`
  flex: 1;
  height: 16px;
  background-color: ${OFF};
  &:nth-of-type(1) {
    height: 48px;
    background-color: ${MATCH};
  }
`;

export function SiblingNthBoard() {
  return (
    <Stack>
      <Legend>
        <LegendItem>
          <LegendSwatch $color={OFF} />
          <LegendText>OFF</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color={MATCH} />
          <LegendText>RULE FIRES</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color={MARKER_COLOR} $square />
          <LegendText>MARKER</LegendText>
        </LegendItem>
      </Legend>

      <Section>
        <SectionTitle>Sibling combinators</SectionTitle>
        <RowGroup>
          <LabeledRow>
            <InlineMarkdown variant="brief">
              {'`${Marker} + &` — adjacent: prev sibling must be a `Marker`'}
            </InlineMarkdown>
            <ProbeRow>
              <AdjacentProbe />
              <Marker />
              <AdjacentProbe />
              <View style={{ width: 8 }} />
              <Marker />
              <AdjacentProbe />
            </ProbeRow>
          </LabeledRow>

          <LabeledRow>
            <InlineMarkdown variant="brief">
              {'`${Marker} ~ &` — general: any prior sibling must be a `Marker`'}
            </InlineMarkdown>
            <ProbeRow>
              <GeneralProbe />
              <Marker />
              <GeneralProbe />
              <GeneralProbe />
            </ProbeRow>
          </LabeledRow>
        </RowGroup>
      </Section>

      <Section>
        <SectionTitle>:nth-child positions</SectionTitle>
        <RowGroup>
          <LabeledRow>
            <InlineMarkdown variant="brief">
              {'`&:first-child` — only the first probe fires'}
            </InlineMarkdown>
            <ProbeRow>
              <PosProbe />
              <PosProbe />
              <PosProbe />
              <PosProbe />
            </ProbeRow>
          </LabeledRow>

          <LabeledRow>
            <InlineMarkdown variant="brief">
              {'`&:last-child` — only the final probe fires'}
            </InlineMarkdown>
            <ProbeRow>
              <LastProbe />
              <LastProbe />
              <LastProbe />
              <LastProbe />
            </ProbeRow>
          </LabeledRow>

          <LabeledRow>
            <InlineMarkdown variant="brief">{'`&:nth-child(odd)` — alternating'}</InlineMarkdown>
            <ProbeRow>
              <OddProbe />
              <OddProbe />
              <OddProbe />
              <OddProbe />
              <OddProbe />
            </ProbeRow>
          </LabeledRow>

          <LabeledRow>
            <InlineMarkdown variant="brief">
              {'`&:nth-child(2)` — only the second probe fires'}
            </InlineMarkdown>
            <ProbeRow>
              <Nth2Probe />
              <Nth2Probe />
              <Nth2Probe />
              <Nth2Probe />
            </ProbeRow>
          </LabeledRow>
        </RowGroup>
      </Section>

      <Section>
        <SectionTitle>:nth-of-type vs :nth-child</SectionTitle>
        <Markdown variant="hint">
          {
            'Same parent, mixed element types (`View` + `Text`). `:nth-of-type(1)` indexes only same-target siblings — the first `View` matches even though it is the second JSX child.'
          }
        </Markdown>
        <ProbeRow>
          <InlineMarkdown variant="brief">{'`(Text)`'}</InlineMarkdown>
          <TypeProbe />
          <TypeProbe />
        </ProbeRow>
      </Section>
    </Stack>
  );
}
