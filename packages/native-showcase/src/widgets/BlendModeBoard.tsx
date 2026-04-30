import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stage = styled.View`
  height: 200px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  background-image: linear-gradient(135deg, #ff8a00, #6b1bb1);
  isolation: isolate;
  align-items: center;
  justify-content: center;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
`;

const Disk = styled.View`
  width: 84px;
  height: 84px;
  border-radius: ${t.radius.pill}px;
`;

const Multiply = styled(Disk)`
  background-color: #ffd166;
  mix-blend-mode: multiply;
`;

const Screen = styled(Disk)`
  background-color: #1f7a52;
  mix-blend-mode: screen;
`;

const Difference = styled(Disk)`
  background-color: #f5f3ee;
  mix-blend-mode: difference;
`;

const Caption = styled.Text`
  position: absolute;
  bottom: ${t.space.xs}px;
  left: ${t.space.xs}px;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.bg};
  background-color: rgba(14, 14, 16, 0.55);
  padding: 2px 6px;
  text-transform: uppercase;
`;

export function BlendModeBoard() {
  return (
    <Stage>
      <Row>
        <Multiply />
        <Screen />
        <Difference />
      </Row>
      <Caption>multiply · screen · difference</Caption>
    </Stage>
  );
}
