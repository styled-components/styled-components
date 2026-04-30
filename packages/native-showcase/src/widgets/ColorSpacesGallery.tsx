import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * A real-world oklch design palette compiled at transform time, plus a
 * color-mix interpolation demo. Shows that you can write modern color
 * notation in your styled-components and the polyfill produces a clean
 * sRGB result that holds up as a token system on iOS.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Section = styled.View`
  gap: ${t.space.xs}px;
`;

const Heading = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: 12px;
  line-height: 17px;
  color: ${t.colors.fgMuted};
`;

const PaletteRow = styled.View`
  flex-direction: row;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
`;

const Tone = styled.View`
  flex: 1;
  height: 36px;
`;

// Same L/C tone curve across four hues — this is exactly the shape a real
// design system uses (think Tailwind's 50–900 scale). Lower chroma at the
// extremes mirrors the gamut narrowing toward white and black.

// Rose · hue 15
const Rose50 = styled(Tone)`background-color: oklch(0.97 0.015 15);`;
const Rose100 = styled(Tone)`background-color: oklch(0.92 0.03 15);`;
const Rose200 = styled(Tone)`background-color: oklch(0.85 0.06 15);`;
const Rose300 = styled(Tone)`background-color: oklch(0.75 0.1 15);`;
const Rose400 = styled(Tone)`background-color: oklch(0.65 0.14 15);`;
const Rose500 = styled(Tone)`background-color: oklch(0.55 0.17 15);`;
const Rose600 = styled(Tone)`background-color: oklch(0.45 0.16 15);`;
const Rose700 = styled(Tone)`background-color: oklch(0.35 0.12 15);`;
const Rose800 = styled(Tone)`background-color: oklch(0.25 0.07 15);`;

// Amber · hue 70
const Amber50 = styled(Tone)`background-color: oklch(0.97 0.015 70);`;
const Amber100 = styled(Tone)`background-color: oklch(0.92 0.03 70);`;
const Amber200 = styled(Tone)`background-color: oklch(0.85 0.06 70);`;
const Amber300 = styled(Tone)`background-color: oklch(0.75 0.1 70);`;
const Amber400 = styled(Tone)`background-color: oklch(0.65 0.14 70);`;
const Amber500 = styled(Tone)`background-color: oklch(0.55 0.17 70);`;
const Amber600 = styled(Tone)`background-color: oklch(0.45 0.16 70);`;
const Amber700 = styled(Tone)`background-color: oklch(0.35 0.12 70);`;
const Amber800 = styled(Tone)`background-color: oklch(0.25 0.07 70);`;

// Emerald · hue 150
const Em50 = styled(Tone)`background-color: oklch(0.97 0.015 150);`;
const Em100 = styled(Tone)`background-color: oklch(0.92 0.03 150);`;
const Em200 = styled(Tone)`background-color: oklch(0.85 0.06 150);`;
const Em300 = styled(Tone)`background-color: oklch(0.75 0.1 150);`;
const Em400 = styled(Tone)`background-color: oklch(0.65 0.14 150);`;
const Em500 = styled(Tone)`background-color: oklch(0.55 0.17 150);`;
const Em600 = styled(Tone)`background-color: oklch(0.45 0.16 150);`;
const Em700 = styled(Tone)`background-color: oklch(0.35 0.12 150);`;
const Em800 = styled(Tone)`background-color: oklch(0.25 0.07 150);`;

// Indigo · hue 260
const Ind50 = styled(Tone)`background-color: oklch(0.97 0.015 260);`;
const Ind100 = styled(Tone)`background-color: oklch(0.92 0.03 260);`;
const Ind200 = styled(Tone)`background-color: oklch(0.85 0.06 260);`;
const Ind300 = styled(Tone)`background-color: oklch(0.75 0.1 260);`;
const Ind400 = styled(Tone)`background-color: oklch(0.65 0.14 260);`;
const Ind500 = styled(Tone)`background-color: oklch(0.55 0.17 260);`;
const Ind600 = styled(Tone)`background-color: oklch(0.45 0.16 260);`;
const Ind700 = styled(Tone)`background-color: oklch(0.35 0.12 260);`;
const Ind800 = styled(Tone)`background-color: oklch(0.25 0.07 260);`;

const MixRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
`;

const MixSwatch = styled.View`
  width: 44px;
  height: 28px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
`;

const Red = styled(MixSwatch)`background-color: #ff0040;`;
const Blue = styled(MixSwatch)`background-color: #0050ff;`;
const MixSrgb = styled(MixSwatch)`background-color: color-mix(in srgb, #ff0040, #0050ff);`;
const MixOklab = styled(MixSwatch)`background-color: color-mix(in oklab, #ff0040, #0050ff);`;
const MixOklch = styled(MixSwatch)`background-color: color-mix(in oklch, #ff0040, #0050ff);`;

const MixLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
  flex: 1;
`;

const Arrow = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgFaint};
`;

const RowLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgFaint};
  width: 56px;
`;

const PaletteCluster = styled.View`
  gap: 2px;
`;

const PaletteLine = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.xs}px;
`;

export function ColorSpacesGallery() {
  return (
    <Stack>
      <Section>
        <Heading>oklch · tonal scales · 50→800 stops</Heading>
        <PaletteCluster>
          <PaletteLine>
            <RowLabel>rose</RowLabel>
            <PaletteRow style={{ flex: 1 }}>
              <Rose50 />
              <Rose100 />
              <Rose200 />
              <Rose300 />
              <Rose400 />
              <Rose500 />
              <Rose600 />
              <Rose700 />
              <Rose800 />
            </PaletteRow>
          </PaletteLine>
          <PaletteLine>
            <RowLabel>amber</RowLabel>
            <PaletteRow style={{ flex: 1 }}>
              <Amber50 />
              <Amber100 />
              <Amber200 />
              <Amber300 />
              <Amber400 />
              <Amber500 />
              <Amber600 />
              <Amber700 />
              <Amber800 />
            </PaletteRow>
          </PaletteLine>
          <PaletteLine>
            <RowLabel>emerald</RowLabel>
            <PaletteRow style={{ flex: 1 }}>
              <Em50 />
              <Em100 />
              <Em200 />
              <Em300 />
              <Em400 />
              <Em500 />
              <Em600 />
              <Em700 />
              <Em800 />
            </PaletteRow>
          </PaletteLine>
          <PaletteLine>
            <RowLabel>indigo</RowLabel>
            <PaletteRow style={{ flex: 1 }}>
              <Ind50 />
              <Ind100 />
              <Ind200 />
              <Ind300 />
              <Ind400 />
              <Ind500 />
              <Ind600 />
              <Ind700 />
              <Ind800 />
            </PaletteRow>
          </PaletteLine>
        </PaletteCluster>
        <Caption>
          Same L/C curve across four hues — exactly the shape a real design system uses.
          Each row scans cleanly from very light to very dark; each column sits at the
          same perceived weight across hues. All thirty-six swatches compile from oklch()
          to a sRGB hex at transform time, so Hermes never has to know oklch exists.
        </Caption>
      </Section>

      <Section>
        <Heading>color-mix · same endpoints, three spaces</Heading>
        <MixRow>
          <Red />
          <Arrow>+</Arrow>
          <Blue />
          <Arrow>=</Arrow>
          <MixSrgb />
          <MixLabel>in srgb</MixLabel>
        </MixRow>
        <MixRow>
          <Red />
          <Arrow>+</Arrow>
          <Blue />
          <Arrow>=</Arrow>
          <MixOklab />
          <MixLabel>in oklab</MixLabel>
        </MixRow>
        <MixRow>
          <Red />
          <Arrow>+</Arrow>
          <Blue />
          <Arrow>=</Arrow>
          <MixOklch />
          <MixLabel>in oklch</MixLabel>
        </MixRow>
        <Caption>
          Mixing red and blue 50/50 in different spaces. sRGB averages channels and lands
          on a dark muddy purple; perceptual spaces preserve brightness through the
          midpoint. Useful when you're interpolating two design tokens and want the
          midpoint to read at the same weight as both ends.
        </Caption>
      </Section>
    </Stack>
  );
}
