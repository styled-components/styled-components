import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stage = styled.View`
  height: 220px;
  border-radius: ${t.radius.lg}px;
  border: 1px solid ${t.colors.border};
  background-color: ${t.colors.surfaceMuted};
  overflow: hidden;
`;

const Floater = styled.View`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0)
    env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
  border-radius: ${t.radius.md}px;
  background-color: ${t.colors.accent};
`;

const FloaterInner = styled.View`
  padding: 14px 18px;
`;

const Title = styled.Text`
  color: ${t.colors.bg};
  font-weight: 700;
  font-size: 14px;
`;

const Sub = styled.Text`
  color: ${t.colors.bg};
  opacity: 0.85;
  font-size: 12px;
  margin-top: 2px;
`;

const Readout = styled.View`
  background-color: ${t.colors.surface};
  border-radius: ${t.radius.md}px;
  padding: ${t.space.md}px;
  border: 1px solid ${t.colors.border};
  gap: 4px;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const Key = styled.Text`
  font-size: 13px;
  color: ${t.colors.fgMuted};
`;

const Val = styled.Text`
  font-size: 13px;
  color: ${t.colors.fg};
  font-variant: tabular-nums;
`;

export function SafeAreaInsetsBadge() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Stage>
        <Floater>
          <FloaterInner>
            <Title>Pinned with env() insets</Title>
            <Sub>Padding pulls real notch / home-bar values</Sub>
          </FloaterInner>
        </Floater>
      </Stage>
      <Readout>
        <Row>
          <Key>top</Key>
          <Val>{insets.top}px</Val>
        </Row>
        <Row>
          <Key>right</Key>
          <Val>{insets.right}px</Val>
        </Row>
        <Row>
          <Key>bottom</Key>
          <Val>{insets.bottom}px</Val>
        </Row>
        <Row>
          <Key>left</Key>
          <Val>{insets.left}px</Val>
        </Row>
      </Readout>
    </>
  );
}
