import { Asset } from 'expo-asset';
import React from 'react';
import styled from 'styled-components/native';
import { Markdown } from '@/components/Markdown';
import { theme as t } from '@/theme/tokens';

/**
 * Demonstrates `background-blend-mode`. On rn-web the browser handles
 * the property natively; on RN iOS/Android styled-components synthesizes
 * the CSS spec by injecting absolutely-positioned blend layers + a
 * forced `isolation: isolate` on the wrapper. Same template, equivalent
 * paint output.
 *
 * The first row stacks the same dog photo over the same red
 * background, varying only the `background-blend-mode` keyword, so the
 * value of each blend mode is directly readable from the visual change.
 *
 * The second row exercises multi-layer blending: two stacked gradients
 * over a green background with paired blend modes (first comma applies
 * to the top gradient, per CSS spec).
 */

// PNG (not JPEG) for color-burn parity. JPEG's lossy DCT lifts the
// deepest darks above zero on iOS/Android decoders; color-burn's
// `Cs=0 → B=0` edge case turns those near-zeros into solid red instead
// of black. PNG round-trips exact pixel values, so the photo enters
// the blend with the same Cs values browsers see.
const dogUri = Asset.fromModule(require('../../assets/dog.png')).uri;

const BLENDS = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
] as const;

const Stack = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.md}px;
`;

const PhotoCard = styled.View<{ $blend: string }>`
  width: 112px;
  height: 112px;
  background-color: #ff77bc;
  background-image: url(${dogUri});
  background-size: cover;
  background-position: bottom;
  background-blend-mode: ${p => p.$blend};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  align-items: flex-start;
  justify-content: flex-end;
  overflow: hidden;
`;

const Label = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.bg};
  background-color: ${t.colors.scrim};
  padding: 2px 6px;
  text-transform: lowercase;
`;

const StackedRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.md}px;
  margin-top: ${t.space.md}px;
`;

const StackedCard = styled.View<{ $blend: string }>`
  width: 168px;
  height: 112px;
  background-color: ${t.colors.pass};
  background-image:
    linear-gradient(135deg, transparent 0%, #000 100%),
    linear-gradient(45deg, #ff8a00 0%, transparent 60%);
  background-blend-mode: ${p => p.$blend};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  align-items: flex-start;
  justify-content: flex-end;
`;

export function BackgroundBlendStudio() {
  return (
    <>
      <Stack>
        {BLENDS.map(blend => (
          <PhotoCard key={blend} $blend={blend}>
            <Label>{blend}</Label>
          </PhotoCard>
        ))}
      </Stack>

      <Markdown variant="hint">
        Same photo + bubble-gum `background-color`, only `background-blend-mode` changes between
        cards.
      </Markdown>

      <StackedRow>
        <StackedCard $blend="multiply, screen">
          <Label>multiply, screen</Label>
        </StackedCard>
        <StackedCard $blend="screen, overlay">
          <Label>screen, overlay</Label>
        </StackedCard>
        <StackedCard $blend="overlay, hard-light">
          <Label>overlay, hard-light</Label>
        </StackedCard>
      </StackedRow>

      <Markdown variant="hint">
        Multi-layer: two stacked gradients with paired blend modes (first comma applies to the top
        gradient).
      </Markdown>

      <Markdown variant="hint">
        On rn-web the browser handles `background-blend-mode` natively. On iOS / Android
        styled-components synthesizes the spec by injecting absolutely-positioned blend layers +
        `isolation: isolate`. Linear-friendly modes (multiply / screen / darken / lighten /
        difference / exclusion) match browsers. Gamma-sensitive modes (color-burn / color-dodge /
        soft-light / overlay / hard-light) render with more saturation on native because platform
        compositors blend in linear-light while browsers blend in gamma-encoded sRGB per CSS spec.
      </Markdown>
    </>
  );
}
