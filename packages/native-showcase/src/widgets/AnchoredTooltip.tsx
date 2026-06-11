import React, { useState } from 'react';
import { Pressable } from 'react-native';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * CSS Anchor Positioning: the tooltip carries no measurement code and
 * no layout JS. The button declares `anchor-name`; the tooltip's inset
 * properties read the anchor's edges with `anchor()` and its width
 * with `anchor-size()`. Tap to move the button: the tooltip tracks it
 * purely through the CSS bindings re-resolving against the new rect.
 */

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
`;

/** Shared parent: anchor and tooltip are siblings (the supported scope). */
const Field = styled.View`
  height: 220px;
  border-width: ${t.borderWidth.hairline}px;
  border-color: ${t.colors.border};
  border-radius: ${t.radius.md}px;
`;

const SaveButton = styled.View<{ $shift: boolean }>`
  anchor-name: --save;
  position: absolute;
  top: ${p => (p.$shift ? 120 : 24)}px;
  left: ${p => (p.$shift ? 140 : 24)}px;
  padding: ${t.space.xs}px ${t.space.md}px;
  border-radius: ${t.radius.sm}px;
  background-color: light-dark(#3451b2, #8da2f0);
`;

const SaveLabel = styled.Text`
  color: light-dark(#ffffff, #10131c);
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.brief}px;
`;

/** Pure CSS attachment: under the button, left-aligned, same width. */
const Tip = styled.View`
  position: absolute;
  top: calc(anchor(--save bottom) + 6px);
  left: anchor(--save left);
  width: anchor-size(--save width);
  padding: ${t.space.xs}px;
  border-radius: ${t.radius.sm}px;
  background-color: ${t.colors.ink};
`;

const TipLabel = styled.Text`
  color: light-dark(#ffffff, #10131c);
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  text-align: center;
`;

export function AnchoredTooltip() {
  const [shift, setShift] = useState(false);

  return (
    <Stack>
      <Caption>top: calc(anchor(--save bottom) + 6px); left: anchor(--save left)</Caption>
      <Field>
        <Pressable onPress={() => setShift(s => !s)}>
          <SaveButton $shift={shift}>
            <SaveLabel>Save (tap me)</SaveLabel>
          </SaveButton>
        </Pressable>
        <Tip>
          <TipLabel>anchored</TipLabel>
        </Tip>
      </Field>
    </Stack>
  );
}
