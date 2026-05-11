import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Container = styled.View<{ $topInset: number; $rightInset: number }>`
  position: absolute;
  top: calc(${p => p.$topInset}px + ${t.space.xs}px);
  right: calc(${p => p.$rightInset}px + ${t.space.md}px);
  flex-direction: row;
  align-items: center;
  gap: ${t.space.xs}px;
  padding: ${t.space.xxs}px ${t.space.xs}px;
  background-color: ${t.colors.surfaceMuted};
  border-width: ${t.borderWidth.hairline}px;
  border-color: ${t.colors.border};
  pointer-events: none;
  z-index: 1000;
`;

const Dot = styled.View<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${p => p.$color};
`;

const Label = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.ink};
  letter-spacing: 0.5px;
`;

const SAMPLE_MS = 500;
const WARN_FPS = 55;
const FAIL_FPS = 30;

/**
 * Sticky overlay that samples frames over a 500ms window via
 * requestAnimationFrame. Re-renders only when the integer FPS value
 * changes so the meter doesn't pollute its own measurement.
 */
export function FpsMeter() {
  const insets = useSafeAreaInsets();
  const [fps, setFps] = React.useState(0);

  React.useEffect(() => {
    let frames = 0;
    let lastSample = performance.now();
    let raf = 0;

    const tick = () => {
      frames += 1;
      const now = performance.now();
      const elapsed = now - lastSample;
      if (elapsed >= SAMPLE_MS) {
        const next = Math.round((frames * 1000) / elapsed);
        setFps(prev => (prev === next ? prev : next));
        frames = 0;
        lastSample = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const color = fps >= WARN_FPS ? t.colors.pass : fps >= FAIL_FPS ? '#d99c00' : t.colors.fail;

  return (
    <Container $topInset={insets.top} $rightInset={insets.right}>
      <Dot $color={color} />
      <Label>{String(fps).padStart(2, '0')} FPS</Label>
    </Container>
  );
}
