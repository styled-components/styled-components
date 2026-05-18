import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { RING_PALETTE } from './PlatonicLogo';

// Logo palette anchors used as seeds for the modern color-function demos.
// The lightness ramp anchors on `red`; color-mix examples interpolate
// between distinct hues to exercise oklch path selection.
const RED = RING_PALETTE[0]; // h=28
const GREEN = RING_PALETTE[6]; // h=136
const BLUE = RING_PALETTE[13]; // h=263
const VIOLET = RING_PALETTE[14]; // h=278

/**
 * Modern color functions: `oklch()`, `oklab()`, `lch()`, `lab()`, and
 * `color-mix()`. Each declaration uses literal arguments so v7 folds
 * them to hex at transform time on native; on rn-web the browser
 * handles them directly. Visually the two paths match; the only
 * empirical difference is on chroma values that exceed the sRGB gamut,
 * where the polyfill clips per channel.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

// Wraps consecutive Rows in the same color-function family (oklch, color-mix)
// so multi-example groupings breathe more than single-example ones.
const Group = styled.View`
  gap: ${t.space.lg}px;
`;

const Row = styled.View`
  gap: ${t.space.xxs}px;
`;

const RowLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.ink};
`;

const RowCaption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

const Strip = styled.View`
  flex-direction: row;
  gap: ${t.borderWidth.hairline}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

const Swatch = styled.View`
  flex: 1;
  height: 56px;
`;

const SwatchLabel = styled.Text`
  flex: 1;
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  text-align: center;
  letter-spacing: 0.4px;
  color: ${t.colors.fgMuted};
`;

const SwatchLabelRow = styled.View`
  flex-direction: row;
  gap: ${t.borderWidth.hairline}px;
`;

// --- Hue ramps ---

const OklchHue0 = styled(Swatch)`
  background-color: oklch(0.72 0.18 25);
`;
const OklchHue1 = styled(Swatch)`
  background-color: oklch(0.72 0.18 85);
`;
const OklchHue2 = styled(Swatch)`
  background-color: oklch(0.72 0.18 145);
`;
const OklchHue3 = styled(Swatch)`
  background-color: oklch(0.72 0.18 205);
`;
const OklchHue4 = styled(Swatch)`
  background-color: oklch(0.72 0.18 265);
`;
const OklchHue5 = styled(Swatch)`
  background-color: oklch(0.72 0.18 325);
`;

// --- Lightness ramp anchored on the logo red, derived via oklch mix ---

const OklchL0 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 33%, white 67%);
`;
const OklchL1 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 67%, white 33%);
`;
const OklchL2 = styled(Swatch)`
  background-color: ${RED};
`;
const OklchL3 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 67%, black 33%);
`;
const OklchL4 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 33%, black 67%);
`;

// --- Oklab (a/b rectangular axes) ---

const Oklab0 = styled(Swatch)`
  background-color: oklab(0.7 0.18 0.1);
`;
const Oklab1 = styled(Swatch)`
  background-color: oklab(0.7 -0.12 0.1);
`;
const Oklab2 = styled(Swatch)`
  background-color: oklab(0.7 -0.12 -0.12);
`;
const Oklab3 = styled(Swatch)`
  background-color: oklab(0.7 0.18 -0.12);
`;

// --- Traditional Lab / LCH ---

const Lab0 = styled(Swatch)`
  background-color: lab(70 40 30);
`;
const Lab1 = styled(Swatch)`
  background-color: lab(70 -30 35);
`;
const Lab2 = styled(Swatch)`
  background-color: lab(70 -10 -45);
`;
const Lab3 = styled(Swatch)`
  background-color: lab(70 45 -25);
`;

const Lch0 = styled(Swatch)`
  background-color: lch(70 60 20);
`;
const Lch1 = styled(Swatch)`
  background-color: lch(70 60 130);
`;
const Lch2 = styled(Swatch)`
  background-color: lch(70 60 240);
`;
const Lch3 = styled(Swatch)`
  background-color: lch(70 60 320);
`;

// --- color-mix interpolation ramp between two logo colors ---

const Mix0 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 100%, ${BLUE} 0%);
`;
const Mix20 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 80%, ${BLUE} 20%);
`;
const Mix40 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 60%, ${BLUE} 40%);
`;
const Mix60 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 40%, ${BLUE} 60%);
`;
const Mix80 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 20%, ${BLUE} 80%);
`;
const Mix100 = styled(Swatch)`
  background-color: color-mix(in oklch, ${RED} 0%, ${BLUE} 100%);
`;

// --- Hue interpolation directions: shorter / longer arc between logo hues ---

const HueShortest0 = styled(Swatch)`
  background-color: color-mix(in oklch shorter hue, ${RED} 100%, ${VIOLET} 0%);
`;
const HueShortest1 = styled(Swatch)`
  background-color: color-mix(in oklch shorter hue, ${RED} 75%, ${VIOLET} 25%);
`;
const HueShortest2 = styled(Swatch)`
  background-color: color-mix(in oklch shorter hue, ${RED} 50%, ${VIOLET} 50%);
`;
const HueShortest3 = styled(Swatch)`
  background-color: color-mix(in oklch shorter hue, ${RED} 25%, ${VIOLET} 75%);
`;
const HueShortest4 = styled(Swatch)`
  background-color: color-mix(in oklch shorter hue, ${RED} 0%, ${VIOLET} 100%);
`;

const HueLonger0 = styled(Swatch)`
  background-color: color-mix(in oklch longer hue, ${RED} 100%, ${VIOLET} 0%);
`;
const HueLonger1 = styled(Swatch)`
  background-color: color-mix(in oklch longer hue, ${RED} 75%, ${VIOLET} 25%);
`;
const HueLonger2 = styled(Swatch)`
  background-color: color-mix(in oklch longer hue, ${RED} 50%, ${VIOLET} 50%);
`;
const HueLonger3 = styled(Swatch)`
  background-color: color-mix(in oklch longer hue, ${RED} 25%, ${VIOLET} 75%);
`;
const HueLonger4 = styled(Swatch)`
  background-color: color-mix(in oklch longer hue, ${RED} 0%, ${VIOLET} 100%);
`;

// --- CSS Color 5 §4 relative-color syntax (literal-base fold) ---
// Each swatch derives from the SAME base color via channel keywords
// inside `calc()`: darken / lighten by adjusting `l`, shift hue by
// adjusting `h`. The polyfill resolves the relative form at compile
// time so iOS / Android receive a literal hex; rn-web folds at the
// same boundary so paint matches across all three.

const RelBase = styled(Swatch)`
  background-color: oklch(from ${RED} l c h);
`;
const RelDarker = styled(Swatch)`
  background-color: oklch(from ${RED} calc(l - 0.15) c h);
`;
const RelLighter = styled(Swatch)`
  background-color: oklch(from ${RED} calc(l + 0.15) c h);
`;
const RelDesaturated = styled(Swatch)`
  background-color: oklch(from ${RED} l calc(c * 0.5) h);
`;
const RelHueShifted = styled(Swatch)`
  background-color: oklch(from ${RED} l c calc(h + 60));
`;

// --- Tints + shades anchored on the logo green ---

const Tint0 = styled(Swatch)`
  background-color: color-mix(in oklab, ${GREEN}, white 10%);
`;
const Tint1 = styled(Swatch)`
  background-color: color-mix(in oklab, ${GREEN}, white 30%);
`;
const Tint2 = styled(Swatch)`
  background-color: color-mix(in oklab, ${GREEN}, white 55%);
`;
const Shade0 = styled(Swatch)`
  background-color: color-mix(in oklab, ${GREEN}, black 15%);
`;
const Shade1 = styled(Swatch)`
  background-color: color-mix(in oklab, ${GREEN}, black 35%);
`;
const Shade2 = styled(Swatch)`
  background-color: color-mix(in oklab, ${GREEN}, black 60%);
`;

export function ColorFunctionsLab() {
  return (
    <Stack>
      <Group>
        <Row>
          <RowLabel>oklch · hue ramp · L 0.72 · C 0.18</RowLabel>
          <RowCaption>oklch(0.72 0.18 [hue])</RowCaption>
          <Strip>
            <OklchHue0 />
            <OklchHue1 />
            <OklchHue2 />
            <OklchHue3 />
            <OklchHue4 />
            <OklchHue5 />
          </Strip>
          <SwatchLabelRow>
            <SwatchLabel>25</SwatchLabel>
            <SwatchLabel>85</SwatchLabel>
            <SwatchLabel>145</SwatchLabel>
            <SwatchLabel>205</SwatchLabel>
            <SwatchLabel>265</SwatchLabel>
            <SwatchLabel>325</SwatchLabel>
          </SwatchLabelRow>
        </Row>
        <Row>
          <RowLabel>oklch · lightness ramp · anchor red</RowLabel>
          <RowCaption>color-mix(in oklch, [red] [n%], white | black [100-n%])</RowCaption>
          <Strip>
            <OklchL0 />
            <OklchL1 />
            <OklchL2 />
            <OklchL3 />
            <OklchL4 />
          </Strip>
          <SwatchLabelRow>
            <SwatchLabel>+W 67%</SwatchLabel>
            <SwatchLabel>+W 33%</SwatchLabel>
            <SwatchLabel>anchor</SwatchLabel>
            <SwatchLabel>+B 33%</SwatchLabel>
            <SwatchLabel>+B 67%</SwatchLabel>
          </SwatchLabelRow>
        </Row>
      </Group>
      <Row>
        <RowLabel>oklab · a/b rectangular</RowLabel>
        <RowCaption>oklab(0.7 ±a ±b)</RowCaption>
        <Strip>
          <Oklab0 />
          <Oklab1 />
          <Oklab2 />
          <Oklab3 />
        </Strip>
        <SwatchLabelRow>
          <SwatchLabel>+a +b</SwatchLabel>
          <SwatchLabel>-a +b</SwatchLabel>
          <SwatchLabel>-a -b</SwatchLabel>
          <SwatchLabel>+a -b</SwatchLabel>
        </SwatchLabelRow>
      </Row>
      <Row>
        <RowLabel>lab · CIE Lab</RowLabel>
        <RowCaption>lab(70 ±a ±b)</RowCaption>
        <Strip>
          <Lab0 />
          <Lab1 />
          <Lab2 />
          <Lab3 />
        </Strip>
      </Row>
      <Row>
        <RowLabel>lch · CIE LCh</RowLabel>
        <RowCaption>lch(70 60 [hue])</RowCaption>
        <Strip>
          <Lch0 />
          <Lch1 />
          <Lch2 />
          <Lch3 />
        </Strip>
        <SwatchLabelRow>
          <SwatchLabel>20</SwatchLabel>
          <SwatchLabel>130</SwatchLabel>
          <SwatchLabel>240</SwatchLabel>
          <SwatchLabel>320</SwatchLabel>
        </SwatchLabelRow>
      </Row>
      <Row>
        <RowLabel>relative-color · derive shades from one base · §4</RowLabel>
        <RowCaption>oklch(from [red] calc(l ±0.15) [calc(c × 0.5)] [calc(h + 60)])</RowCaption>
        <Strip>
          <RelDarker />
          <RelBase />
          <RelLighter />
          <RelDesaturated />
          <RelHueShifted />
        </Strip>
        <SwatchLabelRow>
          <SwatchLabel>−L 0.15</SwatchLabel>
          <SwatchLabel>base</SwatchLabel>
          <SwatchLabel>+L 0.15</SwatchLabel>
          <SwatchLabel>+desat</SwatchLabel>
          <SwatchLabel>+H 60</SwatchLabel>
        </SwatchLabelRow>
      </Row>
      <Group>
        <Row>
          <RowLabel>color-mix · oklch · 6 stops</RowLabel>
          <RowCaption>color-mix(in oklch, [red] [n%], [blue] [100-n%])</RowCaption>
          <Strip>
            <Mix0 />
            <Mix20 />
            <Mix40 />
            <Mix60 />
            <Mix80 />
            <Mix100 />
          </Strip>
          <SwatchLabelRow>
            <SwatchLabel>0%</SwatchLabel>
            <SwatchLabel>20%</SwatchLabel>
            <SwatchLabel>40%</SwatchLabel>
            <SwatchLabel>60%</SwatchLabel>
            <SwatchLabel>80%</SwatchLabel>
            <SwatchLabel>100%</SwatchLabel>
          </SwatchLabelRow>
        </Row>
        <Row>
          <RowLabel>color-mix · shorter hue · red → violet</RowLabel>
          <RowCaption>arc-shortest interpolation between two logo hues</RowCaption>
          <Strip>
            <HueShortest0 />
            <HueShortest1 />
            <HueShortest2 />
            <HueShortest3 />
            <HueShortest4 />
          </Strip>
        </Row>
        <Row>
          <RowLabel>color-mix · longer hue · red → violet</RowLabel>
          <RowCaption>arc-longest interpolation between two logo hues</RowCaption>
          <Strip>
            <HueLonger0 />
            <HueLonger1 />
            <HueLonger2 />
            <HueLonger3 />
            <HueLonger4 />
          </Strip>
        </Row>
        <Row>
          <RowLabel>color-mix · tints + shades</RowLabel>
          <RowCaption>seed logo green, mixed with white / black in oklab</RowCaption>
          <Strip>
            <Shade2 />
            <Shade1 />
            <Shade0 />
            <Tint0 />
            <Tint1 />
            <Tint2 />
          </Strip>
          <SwatchLabelRow>
            <SwatchLabel>-60</SwatchLabel>
            <SwatchLabel>-35</SwatchLabel>
            <SwatchLabel>-15</SwatchLabel>
            <SwatchLabel>+10</SwatchLabel>
            <SwatchLabel>+30</SwatchLabel>
            <SwatchLabel>+55</SwatchLabel>
          </SwatchLabelRow>
        </Row>
      </Group>
    </Stack>
  );
}
