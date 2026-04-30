import React, { useState } from 'react';
import styled from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.xs}px;
`;

const Tile = styled.View`
  flex: 1 1 30%;
  min-width: 90px;
  height: 96px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  background-image: linear-gradient(135deg, #ff8a00, #6b1bb1);
  align-items: center;
  justify-content: center;
`;

const Label = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.bg};
  background-color: rgba(14, 14, 16, 0.6);
  padding: 2px 6px;
`;

const Blur = styled(Tile)`
  filter: blur(4px);
`;

const Saturate = styled(Tile)`
  filter: saturate(2.4);
`;

const HueRotate = styled(Tile)`
  filter: hue-rotate(120deg);
`;

const Grayscale = styled(Tile)`
  filter: grayscale(1);
`;

const Brightness = styled(Tile)`
  filter: brightness(0.55) contrast(1.4);
`;

const DropShadow = styled(Tile)`
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
`;

const Toggle = styled.Pressable`
  align-self: flex-start;
  padding: 5px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  background-color: ${t.colors.bg};

  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
  }
`;

const ToggleLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.8px;
  color: ${t.colors.ink};
  text-transform: uppercase;

  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }
`;

const Off = styled(Tile)`
  filter: none;
`;

export function FilterStack() {
  const [enabled, setEnabled] = useState(true);
  const Tiles = enabled
    ? (
        <Row>
          <Blur>
            <Label>blur</Label>
          </Blur>
          <Saturate>
            <Label>saturate</Label>
          </Saturate>
          <HueRotate>
            <Label>hue-rotate</Label>
          </HueRotate>
          <Grayscale>
            <Label>grayscale</Label>
          </Grayscale>
          <Brightness>
            <Label>chained</Label>
          </Brightness>
          <DropShadow>
            <Label>drop-shadow</Label>
          </DropShadow>
        </Row>
      )
    : (
        <Row>
          {Array.from({ length: 6 }, (_, i) => (
            <Off key={i}>
              <Label>none</Label>
            </Off>
          ))}
        </Row>
      );
  return (
    <>
      <Toggle aria-pressed={!enabled} onPress={() => setEnabled(e => !e)}>
        <ToggleLabel aria-pressed={!enabled}>
          {enabled ? 'Disable filters' : 'Enable filters'}
        </ToggleLabel>
      </Toggle>
      <StateReadout
        entries={[
          { key: 'filter', value: enabled ? 'on · varies per tile' : 'none' },
          { key: 'engine', value: 'iOS SwiftUI (release level: experimental)' },
        ]}
        badge={{ tone: enabled ? 'pass' : 'neutral', label: enabled ? 'ACTIVE' : 'BYPASSED' }}
      />
      {Tiles}
    </>
  );
}
