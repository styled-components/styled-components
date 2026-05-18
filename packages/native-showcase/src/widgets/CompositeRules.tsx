import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Card = styled.Pressable`
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.md}px;
  background-color: ${t.colors.bg};

  &:active {
    background-color: ${t.colors.signalSoft};
  }

  &[data-variant='hot'] {
    background-color: ${t.colors.fail};
  }

  /* attr + pseudo compound - overrides both attr-only and pseudo-only on press. */
  &[data-variant='hot']:active {
    background-color: ${t.colors.ink};
  }

  @media (min-width: 600px) {
    padding: ${t.space.lg}px;

    &:active {
      background-color: ${t.colors.surfaceMuted};
    }

    /* @media + attr + pseudo: only fires on wide, hot, and pressed all at once. */
    &[data-variant='hot']:active {
      background-color: ${t.colors.pass};
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
  return (
    <Stack>
      <Card>
        <Title>Default</Title>
        <Sub>:active changes per breakpoint</Sub>
      </Card>
      <Card data-variant="hot">
        <HotTitle>Hot variant</HotTitle>
        <HotSub>hot + active → ink (narrow), pass-green (wide)</HotSub>
      </Card>
    </Stack>
  );
}
