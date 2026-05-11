import React from 'react';
import styled from 'styled-components/native';
import { darkChip } from '@/components/captionStyles';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Card = styled.View`
  height: 96px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.sm}px;
  justify-content: flex-end;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  color: ${t.colors.bg};
  background-color: ${t.colors.scrim};
  padding: 2px 6px;
  align-self: flex-start;
  text-transform: uppercase;
  ${darkChip}
`;

const Linear = styled(Card)`
  background-image: linear-gradient(135deg, #ff8a00, #c8243a, #6b1bb1);
`;

const ThemeLinear = styled(Card)`
  background-image: linear-gradient(90deg, ${t.colors.fail}, ${t.colors.ink});
`;

const Radial = styled(Card)`
  background-image: radial-gradient(circle at 30% 30%, #ffd166, #1f7a52);
`;

// Stars-and-stripes:
//   - Background paints two layers — the navy canton (40% × 53.85%
//     of the box, pinned to the upper-left via per-layer size +
//     position + no-repeat) plus a 13-stripe linear gradient with
//     hard stops at every 1/13.
//   - The 50 stars are real `★` (U+2605) glyphs in flex-laid-out
//     `<Text>` children. 50 separate `radial-gradient` layers
//     tripped a per-layer-cycling issue in RN iOS's
//     `experimental_backgroundImage` (0.85), and dot glyphs read
//     more correctly as actual stars anyway.
//   - Star positions follow the official 24×26 unit grid (per
//     Executive Order 10834, 1959): 9 evenly-spaced rows at
//     vertical 10..90%, alternating 6 / 5 stars on a 12-cell
//     horizontal grid (long rows on odd cells 1/3/5/7/9/11,
//     short rows on even cells 2/4/6/8/10 via a half-cell pad).
//   - The canton declares `container-type: size`. v7 detects the
//     declaration at compile time and auto-names the container with
//     the styled-component's `styledComponentId` so the runtime
//     publisher and rn-web's CSS emission share one identity. cqh
//     descendants then resolve against canton dimensions on every
//     platform without any extra runtime prop.
//   - Star glyph: U+2605 (★ BLACK STAR). U+2B51 (⭑) has sharper
//     points but is a Unicode 5.1 codepoint with patchy font
//     coverage — Android's Roboto renders it at ~0.45em while
//     iOS's SF Pro renders ~0.6em, and a CSS font-family
//     fallback stack can't equalize that because RN matches font
//     availability, not glyph metrics. ★ is from Unicode 1.1 and
//     has near-universal coverage with consistent ~85% em-box
//     ratio across iOS / Android / web. Tuned to 11cqh so visible
//     diameter sits near the spec K = 11.44% of canton height
//     (E.O. 10834).
//   - Each row positions absolutely with `top: idx*10 + 5%` and
//     `height: 10%`. That gives every row a fixed 10% slot of
//     canton height, with row centers landing exactly at 10/20/…
//     /90% per the spec, and 5% of empty padding above/below.
//     Avoids both `flex: 1` on an absolute parent (iOS lays out
//     children before resolving the parent's pixel height) and
//     `translateY(-50%)` (iOS percentage-transform unreliable).
const RED = '#b22234';
const NAVY = '#3c3b6e';
const CANTON_W = '40%';
const CANTON_H = '53.85%';

const STAR_ROW_COUNTS = [6, 5, 6, 5, 6, 5, 6, 5, 6] as const;

// Flag breaks away from Card to drop the padding — backgrounds
// paint to the border-box while absolute children anchor to the
// padding-box, so any non-zero padding offsets the canton image
// from the StarField that sits over it.
const Flag = styled.View`
  width: 100%;
  aspect-ratio: 19 / 10;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${RED};
  background-image:
    linear-gradient(180deg, ${NAVY} 0%, ${NAVY} 100%),
    linear-gradient(
      180deg,
      ${RED} 0%,
      ${RED} 7.69%,
      #ffffff 7.69%,
      #ffffff 15.38%,
      ${RED} 15.38%,
      ${RED} 23.08%,
      #ffffff 23.08%,
      #ffffff 30.77%,
      ${RED} 30.77%,
      ${RED} 38.46%,
      #ffffff 38.46%,
      #ffffff 46.15%,
      ${RED} 46.15%,
      ${RED} 53.85%,
      #ffffff 53.85%,
      #ffffff 61.54%,
      ${RED} 61.54%,
      ${RED} 69.23%,
      #ffffff 69.23%,
      #ffffff 76.92%,
      ${RED} 76.92%,
      ${RED} 84.62%,
      #ffffff 84.62%,
      #ffffff 92.31%,
      ${RED} 92.31%,
      ${RED} 100%
    );
  background-size: ${CANTON_W} ${CANTON_H}, 100% 100%;
  background-repeat: no-repeat, no-repeat;
`;

const Canton = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  width: ${CANTON_W};
  height: ${CANTON_H};
  container-type: size;
`;

// Row height matches line-height so the glyph's full bounding box
// fits without iOS clipping ascenders/descenders. Each row is
// centered on its spec gridline at idx*10 + 10% = (idx+1)*10%.
const StarRow = styled.View<{ $idx: number; $isShort: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  top: ${p => p.$idx * 10 + 1}%;
  height: 18%;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  ${p => (p.$isShort ? 'padding-left: 8.3333%; padding-right: 8.3333%;' : '')}
`;

// Use a system-font stack rather than a bundled font: ★ is in
// every system font's glyph set, so the system fallback chain
// always resolves it. RN matches the FIRST family that's
// available on the platform, so the chain reads as "iOS picks
// Helvetica, Android picks system default (Roboto), web picks
// whichever is present" — and all three render U+2605 with
// near-identical ~85% em-box coverage. line-height ≈ 1.2× the
// font-size gives the glyph ascender/descender room and fixes
// iOS bottom-clipping.
const Star = styled.Text`
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #ffffff;
  font-size: 11cqh;
  line-height: 14cqh;
  text-align: center;
  /* Shift the glyph upward so its visual center aligns with the */
  /* row's geometric center. ★ sits near the text baseline which */
  /* makes it read low in graphical use without compensation. */
  transform: translateY(-1cqh);
`;

function StarField() {
  return (
    <Canton pointerEvents="none">
      {STAR_ROW_COUNTS.map((count, idx) => (
        <StarRow key={idx} $idx={idx} $isShort={count === 5}>
          {Array.from({ length: count }, (_, i) => (
            <Star key={i}>★</Star>
          ))}
        </StarRow>
      ))}
    </Canton>
  );
}

const FlagTag = styled(Tag)`
  position: absolute;
  left: ${t.space.sm}px;
  bottom: ${t.space.sm}px;
`;

export function GradientPalette() {
  return (
    <Stack>
      <Linear>
        <Tag>linear · static</Tag>
      </Linear>
      <ThemeLinear>
        <Tag>linear · theme tokens</Tag>
      </ThemeLinear>
      <Radial>
        <Tag>radial</Tag>
      </Radial>
      <Flag>
        <StarField />
        <FlagTag>stacked · stars & stripes</FlagTag>
      </Flag>
    </Stack>
  );
}
