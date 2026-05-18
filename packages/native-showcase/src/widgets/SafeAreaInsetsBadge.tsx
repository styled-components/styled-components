import React, { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
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
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0)
    env(safe-area-inset-left, 0);
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

const Hint = styled.Text`
  font-size: 12px;
  color: ${t.colors.fgMuted};
  margin-top: ${t.space.xs}px;
`;

function px(n: number) {
  return `${Math.round(n)}px`;
}

export function SafeAreaInsetsBadge() {
  const [outer, setOuter] = useState<{ w: number; h: number } | null>(null);
  const [inner, setInner] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const onFloaterLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setOuter({ w: width, h: height });
  }, []);

  const onInnerLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setInner({ x, y, w: width, h: height });
  }, []);

  const measured =
    outer && inner
      ? {
          top: inner.y,
          left: inner.x,
          right: Math.max(0, outer.w - inner.x - inner.w),
          bottom: Math.max(0, outer.h - inner.y - inner.h),
        }
      : null;

  return (
    <>
      <Stage>
        <Floater onLayout={onFloaterLayout}>
          <FloaterInner onLayout={onInnerLayout}>
            <Title>Pinned with env() insets</Title>
            <Sub>Padding comes only from `env()` values in this styled rule.</Sub>
          </FloaterInner>
        </Floater>
      </Stage>
      <Readout>
        <Row>
          <Key>top</Key>
          <Val>{measured ? px(measured.top) : ' - '}</Val>
        </Row>
        <Row>
          <Key>right</Key>
          <Val>{measured ? px(measured.right) : ' - '}</Val>
        </Row>
        <Row>
          <Key>bottom</Key>
          <Val>{measured ? px(measured.bottom) : ' - '}</Val>
        </Row>
        <Row>
          <Key>left</Key>
          <Val>{measured ? px(measured.left) : ' - '}</Val>
        </Row>
        <Hint>
          Numbers are the padding applied around the inner block (from layout), matching what
          `env(safe-area-inset-*)` resolved to on this view - not a second data source.
        </Hint>
      </Readout>
    </>
  );
}
