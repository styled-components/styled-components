import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
  flex-wrap: wrap;
`;

const Card = styled.View`
  flex: 1 1 30%;
  min-width: 90px;
  height: 90px;
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  align-items: center;
  justify-content: center;
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

const Soft = styled(Card)`
  box-shadow: 0 6px 18px rgba(14, 14, 16, 0.18);
`;

const Layered = styled(Card)`
  box-shadow:
    0 1px 1px rgba(14, 14, 16, 0.12),
    0 4px 8px rgba(14, 14, 16, 0.1),
    0 16px 28px rgba(14, 14, 16, 0.14);
`;

const Inset = styled(Card)`
  box-shadow: inset 0 0 0 4px ${t.colors.ink};
`;

const Spread = styled(Card)`
  box-shadow: 0 0 0 6px ${t.colors.fail};
`;

const Themed = styled(Card)`
  box-shadow: 0 4px 14px ${t.colors.ink};
`;

const Multi = styled(Card)`
  box-shadow:
    inset 0 0 0 2px ${t.colors.ink},
    0 8px 22px rgba(14, 14, 16, 0.25);
`;

export function ShadowComposer() {
  return (
    <Stack>
      <Row>
        <Soft>
          <Caption>soft</Caption>
        </Soft>
        <Layered>
          <Caption>layered · 3</Caption>
        </Layered>
        <Inset>
          <Caption>inset</Caption>
        </Inset>
      </Row>
      <Row>
        <Spread>
          <Caption>spread</Caption>
        </Spread>
        <Themed>
          <Caption>theme color</Caption>
        </Themed>
        <Multi>
          <Caption>inset + outer</Caption>
        </Multi>
      </Row>
    </Stack>
  );
}
