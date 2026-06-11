import React, { useState } from 'react';
import { Pressable } from 'react-native';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * CSS Values 5 tree-counting functions. Every step shares ONE ruleset;
 * the width ramp and hue ramp come entirely from `sibling-index()`
 * resolving differently per position. The proof is the staircase: if
 * the function stopped firing, every bar would render identically.
 * Adding a step re-resolves `sibling-count()` on the existing rows, so
 * the divided bar redistributes live.
 */

const Stack = styled.View`
  gap: ${t.space.lg}px;
`;

const Section = styled.View`
  gap: ${t.space.sm}px;
`;

const SectionTitle = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.brief}px;
  color: ${t.colors.ink};
  letter-spacing: -0.2px;
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
`;

/** One rule, five renders: width and hue both keyed off position. */
const Step = styled.View`
  height: 18px;
  width: calc(sibling-index() * 13%);
  background-color: oklch(0.72 0.14 calc(sibling-index() * 55));
  border-radius: ${t.radius.sm}px;
`;

const Ladder = styled.View`
  gap: ${t.space.xxs}px;
`;

/** Evenly divides the row no matter how many segments are mounted. */
const Segment = styled.View`
  height: 26px;
  width: calc(94% / sibling-count());
  background-color: light-dark(#3451b2, #8da2f0);
  border-radius: ${t.radius.sm}px;
`;

const SegmentRow = styled.View`
  flex-direction: row;
  gap: ${t.space.xxs}px;
`;

const AddButton = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.ink};
  padding: ${t.space.xs}px ${t.space.sm}px;
  border-width: ${t.borderWidth.hairline}px;
  border-color: ${t.colors.border};
  border-radius: ${t.radius.sm}px;
  align-self: flex-start;
`;

export function TreeCountingStaircase() {
  const [segments, setSegments] = useState(3);

  return (
    <Stack>
      <Section>
        <SectionTitle>sibling-index() staircase</SectionTitle>
        <Caption>width: calc(sibling-index() * 13%)</Caption>
        <Ladder>
          <Step />
          <Step />
          <Step />
          <Step />
          <Step />
        </Ladder>
      </Section>
      <Section>
        <SectionTitle>sibling-count() divider</SectionTitle>
        <Caption>width: calc(94% / sibling-count())</Caption>
        <SegmentRow>
          {Array.from({ length: segments }, (_, i) => (
            <Segment key={i} />
          ))}
        </SegmentRow>
        <Pressable onPress={() => setSegments(n => (n >= 6 ? 2 : n + 1))}>
          <AddButton>
            {segments} segments; tap to {segments >= 6 ? 'reset' : 'add one'}
          </AddButton>
        </Pressable>
      </Section>
    </Stack>
  );
}
