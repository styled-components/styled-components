import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
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

const Dot = styled(Animated.View)`
  width: 24px;
  height: 24px;
  border-radius: ${t.radius.pill}px;
  background-color: ${t.colors.accent};
`;

const Caption = styled.Text`
  text-align: center;
  font-size: 13px;
  color: ${t.colors.fgMuted};
`;

export function ReducedMotionBeacon() {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      pulse.setValue(0.5);
      return;
    }
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <>
      <Stage>
        <Dot style={{ opacity, transform: [{ scale }] }} />
      </Stage>
      <Caption>
        {reduce
          ? 'reduce-motion is on. The beacon stays steady.'
          : 'Beacon pulses smoothly. Toggle reduce-motion in OS settings to settle it.'}
      </Caption>
    </>
  );
}
