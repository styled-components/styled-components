import { oklchToP3, P3Swatch } from 'p3-color';
import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Real-world oklch design palette compiled to sRGB hex by the polyfill,
 * compared against the same palette rendered natively in Display-P3 via
 * a tiny Expo module on iOS. On a P3-capable display the bottom row of
 * each pair shows the wide-gamut version; older displays gamut-map down
 * and the pair looks identical.
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
  height: 30px;
`;

const HueLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgFaint};
  margin-top: ${t.space.xs}px;
`;

const RowLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: 10px;
  color: ${t.colors.fgFaint};
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 2px;
`;

// Same L/C tone curve across four hues — Tailwind 50→800 shape.
const TONE_STOPS: Array<{ L: number; C: number }> = [
  { L: 0.97, C: 0.015 },
  { L: 0.92, C: 0.03 },
  { L: 0.85, C: 0.06 },
  { L: 0.75, C: 0.1 },
  { L: 0.65, C: 0.14 },
  { L: 0.55, C: 0.17 },
  { L: 0.45, C: 0.16 },
  { L: 0.35, C: 0.12 },
  { L: 0.25, C: 0.07 },
];

// ─── Rose · hue 15 ─────────────────────────────────────────────────
const Rose50 = styled(Tone)`background-color: oklch(0.97 0.015 15);`;
const Rose100 = styled(Tone)`background-color: oklch(0.92 0.03 15);`;
const Rose200 = styled(Tone)`background-color: oklch(0.85 0.06 15);`;
const Rose300 = styled(Tone)`background-color: oklch(0.75 0.1 15);`;
const Rose400 = styled(Tone)`background-color: oklch(0.65 0.14 15);`;
const Rose500 = styled(Tone)`background-color: oklch(0.55 0.17 15);`;
const Rose600 = styled(Tone)`background-color: oklch(0.45 0.16 15);`;
const Rose700 = styled(Tone)`background-color: oklch(0.35 0.12 15);`;
const Rose800 = styled(Tone)`background-color: oklch(0.25 0.07 15);`;

// ─── Amber · hue 70 ─────────────────────────────────────────────────
const Amber50 = styled(Tone)`background-color: oklch(0.97 0.015 70);`;
const Amber100 = styled(Tone)`background-color: oklch(0.92 0.03 70);`;
const Amber200 = styled(Tone)`background-color: oklch(0.85 0.06 70);`;
const Amber300 = styled(Tone)`background-color: oklch(0.75 0.1 70);`;
const Amber400 = styled(Tone)`background-color: oklch(0.65 0.14 70);`;
const Amber500 = styled(Tone)`background-color: oklch(0.55 0.17 70);`;
const Amber600 = styled(Tone)`background-color: oklch(0.45 0.16 70);`;
const Amber700 = styled(Tone)`background-color: oklch(0.35 0.12 70);`;
const Amber800 = styled(Tone)`background-color: oklch(0.25 0.07 70);`;

// ─── Emerald · hue 150 ─────────────────────────────────────────────
const Em50 = styled(Tone)`background-color: oklch(0.97 0.015 150);`;
const Em100 = styled(Tone)`background-color: oklch(0.92 0.03 150);`;
const Em200 = styled(Tone)`background-color: oklch(0.85 0.06 150);`;
const Em300 = styled(Tone)`background-color: oklch(0.75 0.1 150);`;
const Em400 = styled(Tone)`background-color: oklch(0.65 0.14 150);`;
const Em500 = styled(Tone)`background-color: oklch(0.55 0.17 150);`;
const Em600 = styled(Tone)`background-color: oklch(0.45 0.16 150);`;
const Em700 = styled(Tone)`background-color: oklch(0.35 0.12 150);`;
const Em800 = styled(Tone)`background-color: oklch(0.25 0.07 150);`;

// ─── Indigo · hue 260 ──────────────────────────────────────────────
const Ind50 = styled(Tone)`background-color: oklch(0.97 0.015 260);`;
const Ind100 = styled(Tone)`background-color: oklch(0.92 0.03 260);`;
const Ind200 = styled(Tone)`background-color: oklch(0.85 0.06 260);`;
const Ind300 = styled(Tone)`background-color: oklch(0.75 0.1 260);`;
const Ind400 = styled(Tone)`background-color: oklch(0.65 0.14 260);`;
const Ind500 = styled(Tone)`background-color: oklch(0.55 0.17 260);`;
const Ind600 = styled(Tone)`background-color: oklch(0.45 0.16 260);`;
const Ind700 = styled(Tone)`background-color: oklch(0.35 0.12 260);`;
const Ind800 = styled(Tone)`background-color: oklch(0.25 0.07 260);`;

const HUES: Array<{ name: string; hue: number; cells: React.ComponentType[] }> = [
  {
    name: 'rose',
    hue: 15,
    cells: [Rose50, Rose100, Rose200, Rose300, Rose400, Rose500, Rose600, Rose700, Rose800],
  },
  {
    name: 'amber',
    hue: 70,
    cells: [
      Amber50,
      Amber100,
      Amber200,
      Amber300,
      Amber400,
      Amber500,
      Amber600,
      Amber700,
      Amber800,
    ],
  },
  {
    name: 'emerald',
    hue: 150,
    cells: [Em50, Em100, Em200, Em300, Em400, Em500, Em600, Em700, Em800],
  },
  {
    name: 'indigo',
    hue: 260,
    cells: [Ind50, Ind100, Ind200, Ind300, Ind400, Ind500, Ind600, Ind700, Ind800],
  },
];

const P3PaletteRow = ({ hue }: { hue: number }) => (
  <PaletteRow>
    {TONE_STOPS.map(({ L, C }, i) => {
      const { r, g, b } = oklchToP3(L, C, hue);
      return <P3Swatch key={i} r={r} g={g} b={b} style={{ flex: 1, height: 30 }} />;
    })}
  </PaletteRow>
);

// ─── color-mix endpoints + comparison swatches ──────────────────────

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

const HueGroup = styled.View`
  gap: 2px;
`;

export function ColorSpacesGallery() {
  return (
    <Stack>
      <Section>
        <Heading>oklch tonal scales · sRGB polyfill vs Display-P3 (iOS)</Heading>
        {HUES.map(({ name, hue, cells }) => (
          <HueGroup key={name}>
            <HueLabel>{name}</HueLabel>
            <RowLabel>sRGB · polyfill output</RowLabel>
            <PaletteRow>
              {cells.map((Cell, i) => (
                <Cell key={i} />
              ))}
            </PaletteRow>
            <RowLabel>Display-P3 · native UIKit</RowLabel>
            <P3PaletteRow hue={hue} />
          </HueGroup>
        ))}
        <Caption>
          Each hue: top row is the polyfill compiling oklch() to a sRGB hex at transform
          time, bottom row is the same OKLCh tokens converted via the linear-sRGB → XYZ →
          linear Display-P3 pipeline and rendered through a tiny Expo module wrapping{' '}
          <HueLabel>UIColor(displayP3Red:green:blue:alpha:)</HueLabel>. On a P3-capable
          display the saturated mid-tones (400–600) read distinctly more vivid in the P3
          row. On older sRGB-only displays both rows look identical.
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
          Mixing red and blue 50/50: sRGB averages channels and lands on a dark muddy
          purple; perceptual spaces preserve brightness through the midpoint.
        </Caption>
      </Section>
    </Stack>
  );
}
