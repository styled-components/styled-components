import React from 'react';
import styled, { useMediaQuery } from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Card = styled.Pressable`
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: ${t.space.md}px;
  background-color: ${t.colors.bg};

  &:active {
    background-color: ${t.colors.signalSoft};
  }

  &[data-variant='hot'] {
    background-color: ${t.colors.fail};
  }

  @media (min-width: 600px) {
    padding: ${t.space.lg}px;

    &:active {
      background-color: ${t.colors.surfaceMuted};
    }
  }

  @media (max-width: 599px) {
    &[data-variant='hot']:active {
      background-color: ${t.colors.ink};
    }
  }
`;

const Title = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.title}px;
  color: ${t.colors.ink};
`;

const Sub = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
  margin-top: 4px;
`;

const HotTitle = styled(Title)`
  color: ${t.colors.bg};
`;

const HotSub = styled(Sub)`
  color: ${t.colors.bg};
  opacity: 0.85;
`;

export function CompositeRules() {
  const isWide = useMediaQuery('(min-width: 600px)');
  return (
    <Stack>
      <StateReadout
        entries={[
          { key: 'rule', value: '@media + &:active composite gate' },
          { key: 'breakpoint', value: isWide ? 'wide (>= 600px)' : 'narrow (< 600px)' },
        ]}
        badge={{ tone: 'neutral', label: 'PRESS A CARD' }}
      />
      <Card>
        <Title>Default</Title>
        <Sub>:active changes per breakpoint</Sub>
      </Card>
      <Card data-variant="hot">
        <HotTitle>Hot variant</HotTitle>
        <HotSub>narrow + hot + active = ink</HotSub>
      </Card>
    </Stack>
  );
}
