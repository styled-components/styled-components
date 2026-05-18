import React, { useEffect, useState } from 'react';
import styled, { useMediaEnv } from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Demonstrates the v7 @keyframes animation adapter on React Native.
 *
 * Every row uses CSS `animation` with inline `@keyframes` definitions -
 * no manual Animated.Value, no useRef, no imperative start/stop. The
 * engine wires Animated.timing / loop / sequence under the hood.
 *
 * All animations target native-driver-eligible properties (transform,
 * opacity, backgroundColor, borderRadius) so they run entirely off the
 * main thread on iOS and Android.
 *
 * Features demonstrated:
 * - @keyframes with from/to and percentage stops
 * - animation-iteration-count: infinite
 * - Per-frame animation-timing-function
 * - animation-fill-mode: both with animation-delay (stagger)
 * - animation-play-state toggling (pause/resume)
 * - Multi-property keyframes (transform+opacity, rotateY+scaleX+color)
 * - Theme tokens resolving inside @keyframes frames
 * - prefers-reduced-motion gating
 */

// ── Layout primitives ──

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const RowFrame = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
`;

const BlockFrame = styled.View`
  gap: ${t.space.xs}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
`;

const BlockHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
`;

const LabelCol = styled.View`
  flex: 1;
  gap: 2px;
`;

const Label = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

const Feature = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: 10px;
  letter-spacing: 0.4px;
  color: ${t.colors.fgMuted};
`;

const CellFrame = styled.View`
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
`;

// ── Play/pause control ──

const ControlRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: ${t.space.xs}px ${t.space.md}px;
  border: ${t.borderWidth.heavy}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
`;

const ControlLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.mono}px;
  letter-spacing: 0.6px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

// ── 1. Continuous rotation (from/to, infinite, linear) ──

const SpinBox = styled.View<{ $play: boolean }>`
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  animation: spin 1200ms linear infinite;
  animation-play-state: ${p => (p.$play ? 'running' : 'paused')};
`;

// ── 2. Breathe pulse (scale+opacity, 3-stop, ease-in-out) ──

const BreatheDot = styled.View<{ $play: boolean }>`
  @keyframes breathe {
    0% {
      transform: scale(0.6);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
    100% {
      transform: scale(0.6);
      opacity: 0.3;
    }
  }
  width: 24px;
  height: 24px;
  border-radius: ${t.radius.pill}px;
  background-color: ${t.colors.pass};
  animation: breathe 2s ease-in-out infinite;
  animation-play-state: ${p => (p.$play ? 'running' : 'paused')};
`;

// ── 3. Jelly squash-and-stretch (volume-preserving scaleX/Y, 7-stop) ──

const JellyStage = styled.View`
  width: 56px;
  height: 56px;
  align-items: center;
  padding-top: 2px;
`;

const JellyBall = styled.View<{ $play: boolean }>`
  @keyframes jelly {
    0% {
      transform: translateY(0px) scaleX(1) scaleY(1);
      animation-timing-function: ease-in;
    }
    35% {
      transform: translateY(26px) scaleX(1.3) scaleY(0.7);
      animation-timing-function: ease-out;
    }
    52% {
      transform: translateY(0px) scaleX(0.85) scaleY(1.2);
      animation-timing-function: ease-in;
    }
    67% {
      transform: translateY(14px) scaleX(1.15) scaleY(0.88);
      animation-timing-function: ease-out;
    }
    79% {
      transform: translateY(0px) scaleX(0.96) scaleY(1.05);
      animation-timing-function: ease-in;
    }
    90% {
      transform: translateY(6px) scaleX(1.04) scaleY(0.96);
      animation-timing-function: ease-out;
    }
    100% {
      transform: translateY(0px) scaleX(1) scaleY(1);
    }
  }
  width: 20px;
  height: 20px;
  border-radius: ${t.radius.pill}px;
  background-color: ${t.colors.fail};
  animation: jelly 1.6s infinite;
  animation-play-state: ${p => (p.$play ? 'running' : 'paused')};
`;

// ── 4. 3D card flip (rotateY + scaleX pinch + opacity crossfade, alternate) ──

const FlipCard = styled.View<{ $play: boolean }>`
  @keyframes cardFlip {
    0% {
      transform: perspective(800px) rotateY(0deg) scaleX(1);
      opacity: 1;
      background-color: ${t.colors.ink};
    }
    40% {
      transform: perspective(800px) rotateY(72deg) scaleX(0.88);
      opacity: 1;
    }
    50% {
      transform: perspective(800px) rotateY(90deg) scaleX(0.6);
      opacity: 0;
    }
    60% {
      transform: perspective(800px) rotateY(108deg) scaleX(0.88);
      opacity: 1;
      background-color: ${t.colors.pass};
    }
    100% {
      transform: perspective(800px) rotateY(180deg) scaleX(1);
      opacity: 1;
      background-color: ${t.colors.pass};
    }
  }
  width: 28px;
  height: 36px;
  border-radius: 4px;
  background-color: ${t.colors.ink};
  animation: cardFlip 1.8s ease-in-out infinite alternate;
  animation-play-state: ${p => (p.$play ? 'running' : 'paused')};
`;

// ── 5. Color wave (backgroundColor, 5-stop, linear) ──

const ColorBar = styled.View<{ $play: boolean }>`
  @keyframes colorWave {
    0% {
      background-color: ${t.colors.pass};
    }
    25% {
      background-color: ${t.colors.accent};
    }
    50% {
      background-color: ${t.colors.fail};
    }
    75% {
      background-color: ${t.colors.accent};
    }
    100% {
      background-color: ${t.colors.pass};
    }
  }
  height: 8px;
  border-radius: ${t.radius.pill}px;
  background-color: ${t.colors.pass};
  animation: colorWave 3s linear infinite;
  animation-play-state: ${p => (p.$play ? 'running' : 'paused')};
`;

// ── 6. Stagger in/out cycle (delay + fill-mode: both) ──

const StaggerGroup = styled.View`
  gap: ${t.space.xxs}px;
`;

const StaggerBarIn = styled.View<{ $play: boolean; $i: number }>`
  @keyframes slideIn {
    from {
      transform: translateX(-40px);
      opacity: 0;
    }
    to {
      transform: translateX(0px);
      opacity: 1;
    }
  }
  height: 6px;
  width: ${p => 100 - p.$i * 12}%;
  border-radius: ${t.radius.pill}px;
  background-color: ${t.colors.ink};
  opacity: 1;
  animation: slideIn 500ms ease-out ${p => p.$i * 150}ms both;
  animation-play-state: ${p => (p.$play ? 'running' : 'paused')};
`;

const StaggerBarOut = styled.View<{ $play: boolean; $i: number }>`
  @keyframes slideOut {
    from {
      transform: translateX(0px);
      opacity: 1;
    }
    to {
      transform: translateX(40px);
      opacity: 0;
    }
  }
  height: 6px;
  width: ${p => 100 - p.$i * 12}%;
  border-radius: ${t.radius.pill}px;
  background-color: ${t.colors.ink};
  opacity: 1;
  animation: slideOut 500ms ease-in ${p => p.$i * 150}ms both;
  animation-play-state: ${p => (p.$play ? 'running' : 'paused')};
`;

const STAGGER_BARS = 4;
const STAGGER_ANIM_MS = 500 + (STAGGER_BARS - 1) * 150;
const STAGGER_HOLD_MS = 1200;

// ── Caption ──

const Caption = styled.Text`
  font-size: 13px;
  color: ${t.colors.fgMuted};
`;

// ── Helpers ──

interface RowProps {
  label: string;
  feature: string;
  children: React.ReactNode;
}

function Row({ label, feature, children }: RowProps) {
  return (
    <RowFrame>
      <LabelCol>
        <Label>{label}</Label>
        <Feature>{feature}</Feature>
      </LabelCol>
      {children}
    </RowFrame>
  );
}

function Block({ label, feature, children }: RowProps) {
  return (
    <BlockFrame>
      <BlockHeader>
        <LabelCol>
          <Label>{label}</Label>
          <Feature>{feature}</Feature>
        </LabelCol>
      </BlockHeader>
      {children}
    </BlockFrame>
  );
}

// ── Main widget ──

export function KeyframeOrchestra() {
  const [playing, setPlaying] = useState(true);
  const [staggerDir, setStaggerDir] = useState<'in' | 'out'>('in');
  const [staggerKey, setStaggerKey] = useState(0);
  const env = useMediaEnv();
  const active = playing && !env.reduceMotion;

  useEffect(() => {
    if (!active) return;
    const wait = STAGGER_ANIM_MS + STAGGER_HOLD_MS;
    const id = setTimeout(() => {
      setStaggerDir(d => {
        const next = d === 'in' ? 'out' : 'in';
        if (next === 'in') setStaggerKey(k => k + 1);
        return next;
      });
    }, wait);
    return () => clearTimeout(id);
  }, [staggerDir, staggerKey, active]);

  const toggle = () => {
    if (!playing) {
      setStaggerDir('in');
      setStaggerKey(k => k + 1);
    }
    setPlaying(p => !p);
  };

  const StaggerBar = staggerDir === 'in' ? StaggerBarIn : StaggerBarOut;

  return (
    <Stack>
      <ControlRow onPress={toggle} accessibilityRole="button">
        <ControlLabel>{active ? 'pause all' : 'play all'}</ControlLabel>
      </ControlRow>

      <Row label="spin" feature="infinite · linear · from/to">
        <CellFrame>
          <SpinBox $play={active} />
        </CellFrame>
      </Row>

      <Row label="breathe" feature="scale + opacity · 3-stop · ease-in-out">
        <CellFrame>
          <BreatheDot $play={active} />
        </CellFrame>
      </Row>

      <Row label="jelly" feature="squash + stretch · scaleX/Y + translateY · 7-stop">
        <JellyStage>
          <JellyBall $play={active} />
        </JellyStage>
      </Row>

      <Row label="card flip" feature="rotateY + scaleX + opacity · 5-stop · alternate">
        <CellFrame>
          <FlipCard $play={active} />
        </CellFrame>
      </Row>

      <Block label="color wave" feature="background-color · 5-stop · linear">
        <ColorBar $play={active} />
      </Block>

      <Block label="stagger cascade" feature="delay + fill-mode: both · in/out cycle">
        <StaggerGroup key={staggerKey}>
          {[0, 1, 2, 3].map(i => (
            <StaggerBar key={i} $play={active} $i={i} />
          ))}
        </StaggerGroup>
      </Block>

      <Caption>
        {env.reduceMotion
          ? 'Reduce-motion is on - animations skip to their final state.'
          : 'Pure CSS @keyframes - no Animated API at the component layer. All native-thread.'}
      </Caption>
    </Stack>
  );
}
