import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.xs}px;
`;

const Panel = styled.View`
  flex: 1;
  padding: ${t.space.sm}px ${t.space.xs}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  background-color: ${t.colors.bg};
  align-items: center;
  justify-content: center;
  gap: ${t.space.xxs}px;
`;

const Dvh = styled(Panel)`
  height: 25dvh;
`;

const Svh = styled(Panel)`
  height: 25svh;
`;

const Lvh = styled(Panel)`
  height: 25lvh;
`;

const Unit = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: 18px;
  color: ${t.colors.ink};
  letter-spacing: -0.3px;
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgFaint};
  letter-spacing: 0.5px;
  text-transform: uppercase;
  text-align: center;
`;

export function ViewportUnitsHero() {
  return (
    <Row>
      <Dvh>
        <Unit>25dvh</Unit>
        <Caption>Dynamic</Caption>
      </Dvh>
      <Svh>
        <Unit>25svh</Unit>
        <Caption>Smallest</Caption>
      </Svh>
      <Lvh>
        <Unit>25lvh</Unit>
        <Caption>Largest</Caption>
      </Lvh>
    </Row>
  );
}
