import React, { useEffect, useState } from 'react';
import styled, { useMediaQuery } from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stage = styled.View`
  height: 200px;
  border-radius: ${t.radius.lg}px;
  border: 1px solid ${t.colors.border};
  background-color: ${t.colors.surface};
  align-items: center;
  justify-content: center;
`;

/**
 * Pure-CSS pulse: opacity + scale ping-pong between two states via the
 * v7 transition adapter. No `Animated.Value`, no manual `Easing`,
 * no `useRef` - the engine wires Animated.timing under the hood when
 * `$expanded` flips.
 *
 * The widget gates the interval on `prefers-reduced-motion` so the
 * pulse holds steady at its small/dim state. Even if the gate were
 * removed, the adapter would collapse the transition duration to 0
 * when the OS preference is on (`MediaQueryEnv.reduceMotion`), so
 * it's belt-and-braces.
 */
// `cubic-bezier(0.37, 0, 0.63, 1)` is the easeInOutCubic curve. It
// dwells gently at the extremes and accelerates through the middle -
// the closest CSS keyword analogue to a calm inhale/exhale.
const Dot = styled.View<{ $expanded: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: ${t.radius.pill}px;
  background-color: ${t.colors.accent};
  transform: scale(${p => (p.$expanded ? 4 : 1)});
  opacity: ${p => (p.$expanded ? 1 : 0.4)};
  transition:
    transform 1600ms cubic-bezier(0.37, 0, 0.63, 1),
    opacity 1600ms cubic-bezier(0.37, 0, 0.63, 1);
`;

const Caption = styled.Text`
  text-align: center;
  font-size: 13px;
  color: ${t.colors.fgMuted};
`;

export function ReducedMotionBeacon() {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setExpanded(e => !e), 2400);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <>
      <Stage>
        <Dot $expanded={expanded && !reduce} />
      </Stage>
      <Caption>
        {reduce
          ? 'reduce-motion is on. The beacon stays steady.'
          : 'Beacon pulses smoothly. Toggle reduce-motion in OS settings to settle it.'}
      </Caption>
    </>
  );
}
