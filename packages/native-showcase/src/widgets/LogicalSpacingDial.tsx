import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stage = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: ${t.space.sm}px;
  gap: ${t.space.sm}px;
`;

const Brick = styled.View`
  background-color: ${t.colors.signalSoft};
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: ${t.space.sm}px;
`;

const InlineBrick = styled(Brick)`
  margin-inline: ${t.space.lg}px;
`;

const BlockBrick = styled(Brick)`
  margin-block: ${t.space.lg}px;
`;

const PaddedInline = styled(Brick)`
  padding-inline: ${t.space.xl}px;
`;

const PaddedBlock = styled(Brick)`
  padding-block: ${t.space.lg}px;
`;

const InsetBox = styled.View`
  position: relative;
  height: 80px;
  background-color: ${t.colors.surfaceMuted};
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
`;

const InsetTab = styled.View`
  position: absolute;
  inset-inline: ${t.space.lg}px;
  inset-block: ${t.space.sm}px;
  background-color: ${t.colors.ink};
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.ink};
`;

const InsetCaption = styled(Caption)`
  color: ${t.colors.bg};
  text-align: center;
  margin-top: ${t.space.xs}px;
`;

export function LogicalSpacingDial() {
  return (
    <Stage>
      <InlineBrick>
        <Caption>margin-inline</Caption>
      </InlineBrick>
      <BlockBrick>
        <Caption>margin-block</Caption>
      </BlockBrick>
      <PaddedInline>
        <Caption>padding-inline</Caption>
      </PaddedInline>
      <PaddedBlock>
        <Caption>padding-block</Caption>
      </PaddedBlock>
      <InsetBox>
        <InsetTab>
          <InsetCaption>inset-inline · inset-block</InsetCaption>
        </InsetTab>
      </InsetBox>
    </Stage>
  );
}
