import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { Markdown } from '@/components/Markdown';

/**
 * CSS Selectors 4 §15 - descendant (`${Card} &`) and child (`${Card} > &`)
 * combinators against an interpolated styled-component reference.
 *
 * Each probe sits as a direct child of its row container so the child
 * combinator can match. Two independent probes per row, one watching for
 * each rule. A probe paints its color only if its rule fires; the colors
 * don't overlap so the eye reads each combinator's contribution
 * separately.
 *
 * Row 3 shows the gotcha: a styled wrapper inside Card becomes the
 * immediate parent, so the child rule stops firing while descendant
 * still matches.
 */

const PROBE_OFF = 'light-dark(#d4d4d8, #3f3f46)';
const DESC_ON = 'light-dark(#2563eb, #60a5fa)';
const CHILD_ON = 'light-dark(#ea580c, #fb923c)';

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Row = styled.View`
  gap: ${t.space.sm}px;
`;

const PlainRowContainer = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
`;

const Card = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
  padding: ${t.space.md}px;
  background-color: ${t.colors.surfaceMuted};
  border: ${t.borderWidth.hairline}px solid ${t.colors.rule};
`;

const StyledWrapper = styled.View`
  /* Styled intermediary - takes over as the immediate styled parent
     and intercepts the child combinator. */
  flex: 1;
  flex-direction: row;
  gap: ${t.space.sm}px;
  padding: ${t.space.xs}px;
`;

const DescendantProbe = styled.View`
  flex: 1;
  height: 56px;
  background-color: ${PROBE_OFF};

  ${Card} & {
    background-color: ${DESC_ON};
  }
`;

const ChildProbe = styled.View`
  flex: 1;
  height: 56px;
  background-color: ${PROBE_OFF};

  ${Card} > & {
    background-color: ${CHILD_ON};
  }
`;

const LabelsRow = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
  padding-left: ${t.space.md}px;
  padding-right: ${t.space.md}px;
`;

const LabelsRowFlush = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
`;

const ProbeLabel = styled.Text`
  flex: 1;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${t.colors.fgMuted};
`;

const Legend = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.sm}px;
  padding-bottom: ${t.space.xs}px;
`;

const LegendItem = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.xs}px;
`;

const LegendSwatch = styled.View<{ $color: string }>`
  width: 14px;
  height: 14px;
  background-color: ${p => p.$color};
`;

const LegendText = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  color: ${t.colors.fg};
`;

export function SelectorComboBoard() {
  return (
    <Stack>
      <Legend>
        <LegendItem>
          <LegendSwatch $color={PROBE_OFF} />
          <LegendText>OFF</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color={DESC_ON} />
          <LegendText>DESCENDANT FIRES</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color={CHILD_ON} />
          <LegendText>CHILD FIRES</LegendText>
        </LegendItem>
      </Legend>

      <Row>
        <PlainRowContainer>
          <DescendantProbe />
          <ChildProbe />
        </PlainRowContainer>
        <LabelsRowFlush>
          <ProbeLabel>{'${Card} &'}</ProbeLabel>
          <ProbeLabel>{'${Card} > &'}</ProbeLabel>
        </LabelsRowFlush>
        <Markdown variant="hint">
          {'1. Standalone - no `${Card}` ancestor. Both probes stay OFF.'}
        </Markdown>
      </Row>

      <Row>
        <Card>
          <DescendantProbe />
          <ChildProbe />
        </Card>
        <LabelsRow>
          <ProbeLabel>{'${Card} &'}</ProbeLabel>
          <ProbeLabel>{'${Card} > &'}</ProbeLabel>
        </LabelsRow>
        <Markdown variant="hint">
          {
            '2. Direct child of `${Card}` - both probes light up. Descendant and child rules both fire.'
          }
        </Markdown>
      </Row>

      <Row>
        <Card>
          <StyledWrapper>
            <DescendantProbe />
            <ChildProbe />
          </StyledWrapper>
        </Card>
        <LabelsRow>
          <ProbeLabel>{'${Card} &'}</ProbeLabel>
          <ProbeLabel>{'${Card} > &'}</ProbeLabel>
        </LabelsRow>
        <Markdown variant="hint">
          {
            '3. `${Card}` → styled wrapper → probes. Wrapper becomes the immediate parent: child rule stops firing while descendant still matches.'
          }
        </Markdown>
      </Row>
    </Stack>
  );
}
