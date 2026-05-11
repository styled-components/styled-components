import React, { useEffect, useState } from 'react';
import styled from 'styled-components/native';
import { useMediaEnv } from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Background gradients we cross-fade between via stacked layers.
 *
 * Why layers + opacity, not `transition: background-image`? RN's
 * `experimental_backgroundImage` native parser is one-shot at first
 * commit — it doesn't respond to mid-animation `setNativeProps`
 * updates the way numeric / color props do. An Animated string
 * interpolation between two gradients still ticks on the JS driver,
 * but the native side ignores frames between the start and end.
 * Stacking gradient layers and animating the `opacity` of each (which
 * IS in the verified native-driver allowlist) gives us continuous
 * compositing — the visual result is a smooth gradient morph even
 * though no individual gradient string is animating.
 */
const GRADIENTS = [
  'linear-gradient(135deg, rgba(255, 138, 0, 1), rgba(107, 27, 177, 1))',
  'linear-gradient(225deg, rgba(0, 212, 255, 1), rgba(255, 0, 106, 1))',
  'linear-gradient(315deg, rgba(251, 232, 84, 1), rgba(0, 102, 255, 1))',
  'linear-gradient(45deg, rgba(255, 51, 102, 1), rgba(51, 255, 102, 1))',
];

const HOLD_MS = 600;
const TRANSITION_MS = 1200;

const Stage = styled.View`
  height: 200px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  isolation: isolate;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

/** Static base layer — always at full opacity, covered while the incoming overlay fades in. */
const BaseLayer = styled.View<{ $gradient: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: ${p => p.$gradient};
`;

/**
 * Incoming overlay — fades 0 → 1 on top of the base. Remounted on
 * each cycle (via `key`) so the post-cycle reset to opacity 0 doesn't
 * trigger a reverse transition (which would manifest as a flash).
 */
const IncomingLayer = styled.View<{ $gradient: string; $on: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: ${p => p.$gradient};
  opacity: ${p => (p.$on ? 1 : 0)};
  transition: opacity ${TRANSITION_MS}ms ease-in-out;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
  /* rn-web's View defaults include \`z-index: 0\`, so every View is its
     own stacking context on web. The disks' mix-blend-mode would blend
     with this Row's empty backdrop instead of the gradient on Stage —
     \`z-index: auto\` undoes the default on web (no-op on native). */
  z-index: auto;
`;

const Disk = styled.View`
  width: 84px;
  height: 84px;
  border-radius: ${t.radius.pill}px;
`;

const Multiply = styled(Disk)`
  background-color: #ffd166;
  mix-blend-mode: multiply;
`;

const Screen = styled(Disk)`
  background-color: #1f7a52;
  mix-blend-mode: screen;
`;

const Difference = styled(Disk)`
  background-color: #f5f3ee;
  mix-blend-mode: difference;
`;

const Caption = styled.Text`
  position: absolute;
  bottom: ${t.space.xs}px;
  left: ${t.space.xs}px;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.bg};
  background-color: ${t.colors.scrim};
  padding: 2px 6px;
  text-transform: uppercase;
`;

export function BlendModeBoard() {
  const [settled, setSettled] = useState(0);
  const [incomingOn, setIncomingOn] = useState(false);
  const env = useMediaEnv();

  const incoming = (settled + 1) % GRADIENTS.length;

  useEffect(() => {
    // Honour the OS reduce-motion preference.
    if (env.reduceMotion) return;
    let cancelled = false;
    let promoteTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      // Phase 1: trigger the incoming layer to fade in on top of base.
      setIncomingOn(true);
      promoteTimer = setTimeout(() => {
        if (cancelled) return;
        // Phase 2: the incoming layer is now at α=1, fully covering
        // base. Promote: shift `settled` forward (base instantly
        // updates to the new gradient — invisible because it's
        // covered) and reset incoming. The `key` on IncomingLayer is
        // tied to `settled`, so this triggers a remount at α=0 with
        // the NEXT gradient, sidestepping the reverse-transition flash
        // that a plain `setIncomingOn(false)` on the same layer would
        // cause.
        setSettled(s => (s + 1) % GRADIENTS.length);
        setIncomingOn(false);
      }, TRANSITION_MS);
    };

    const id = setInterval(tick, HOLD_MS + TRANSITION_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (promoteTimer) clearTimeout(promoteTimer);
    };
  }, [env.reduceMotion]);

  return (
    <Stage>
      <BaseLayer $gradient={GRADIENTS[settled]} />
      <IncomingLayer
        key={settled}
        $gradient={GRADIENTS[incoming]}
        $on={incomingOn}
      />
      <Row>
        <Multiply />
        <Screen />
        <Difference />
      </Row>
      <Caption>multiply · screen · difference</Caption>
    </Stage>
  );
}
