import React, { useState } from 'react';
import styled from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

const Wrapper = styled.View<{ $containerName: 'card' }>`
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: ${t.space.sm}px;
  gap: ${t.space.sm}px;

  @container card (min-width: 320px) {
    flex-direction: row;
    align-items: center;
    gap: ${t.space.md}px;
  }
`;

const Avatar = styled.View`
  width: 48px;
  height: 48px;
  background-color: ${t.colors.ink};
  align-items: center;
  justify-content: center;

  @container card (min-width: 320px) {
    width: 56px;
    height: 56px;
  }
`;

const Initial = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: 18px;
  color: ${t.colors.bg};
`;

const Body = styled.View`
  flex: 1;
  gap: 2px;
`;

const Name = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: 16px;
  color: ${t.colors.ink};
`;

const Subtitle = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const Action = styled.Pressable`
  align-self: flex-start;
  padding: 6px 12px;
  background-color: ${t.colors.ink};
`;

const ActionLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  color: ${t.colors.bg};
  text-transform: uppercase;
`;

const Stage = styled.View<{ $wide: boolean }>`
  align-self: center;
  width: 220px;

  &[data-wide='true'] {
    width: 380px;
  }
`;

const Toolbar = styled.View`
  flex-direction: row;
  gap: ${t.space.xs}px;
  align-self: center;
`;

const ToolButton = styled.Pressable<{ $active: boolean }>`
  padding: 5px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  background-color: ${t.colors.bg};

  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
  }
`;

const ToolLabel = styled.Text<{ $active: boolean }>`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${t.colors.ink};

  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }
`;

export function ContainerQueryCard() {
  const [wide, setWide] = useState(false);
  const width = wide ? 380 : 220;
  const matches = width >= 320;
  return (
    <>
      <Toolbar>
        <ToolButton $active={!wide} aria-pressed={!wide} onPress={() => setWide(false)}>
          <ToolLabel $active={!wide} aria-pressed={!wide}>
            Narrow · 220
          </ToolLabel>
        </ToolButton>
        <ToolButton $active={wide} aria-pressed={wide} onPress={() => setWide(true)}>
          <ToolLabel $active={wide} aria-pressed={wide}>
            Wide · 380
          </ToolLabel>
        </ToolButton>
      </Toolbar>
      <StateReadout
        entries={[
          { key: 'container.width', value: `${width}px` },
          { key: 'rule', value: '@container card (min-width: 320px)' },
        ]}
        badge={{
          tone: matches ? 'pass' : 'fail',
          label: matches ? 'MATCH · row layout' : 'MISS · column layout',
        }}
      />
      <Stage $wide={wide} data-wide={String(wide)}>
        <Wrapper $containerName="card">
          <Avatar>
            <Initial>EJ</Initial>
          </Avatar>
          <Body>
            <Name>Evan Jacobs</Name>
            <Subtitle>Open source</Subtitle>
          </Body>
          <Action accessibilityRole="button">
            <ActionLabel>Follow</ActionLabel>
          </Action>
        </Wrapper>
      </Stage>
    </>
  );
}
