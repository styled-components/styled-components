import React from 'react';
import styled from 'styled-components/native';
import { Markdown } from '../components/Markdown';
import { theme as t } from '@/theme/tokens';

/**
 * corner-shape, and the honest ceiling of what React Native can draw.
 *
 * All four tiles look nearly the same. That is the correct result, and
 * the reason is the mapping rather than a plumbing failure.
 *
 * iOS does receive and apply the prop: the value reaches
 * `layer.cornerCurve` whenever the view takes Core Animation's border
 * path, which a zero-width uniform-radius tile does. But Apple's
 * `continuous` is not a squircle. It is a curvature-continuity
 * refinement, so it widens the corner region along each edge while
 * barely moving the contour. Measured on the iOS 26 simulator, the
 * outline shifts by under 1% of the side at every radius, peaking at a
 * radius of half the side. At a quarter of the side that is about 6px on
 * a 600px shape, where a true `superellipse(2)` departs by about 52px.
 * The mapping delivers roughly an eighth of the shape change the CSS
 * asks for, so no tile size makes it visible; do not spend time resizing
 * this board hunting for a contour delta.
 *
 * Android never gets that far: `borderCurve` is absent from the Android
 * view config, so the prop is dropped before it reaches a native view.
 * The warning comes from this library, not from React Native.
 *
 * The last two tiles are the cases that look like bugs but are not.
 * `superellipse(2)` is the spec definition of `squircle`, so matching its
 * neighbor exactly is the pass condition. `scoop` has no native contour
 * at all: the declaration drops with a warning, which is why it is drawn
 * with a dashed outline rather than left to masquerade as a shape that
 * rendered.
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

const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.md}px;
`;

/**
 * Amplifier for a difference too small to see side by side.
 *
 * `round` and `squircle` are stacked in one box with the squircle on top,
 * so the orange only shows where the two contours disagree. On iOS that
 * is a hairline confined to the shoulders of each corner, thickest where
 * the corner meets the straight edge and vanishing at the diagonal, which
 * is the signature of Apple's continuous curve being applied.
 *
 * An even rim along the straight edges would mean something else: two
 * coincident shapes sitting a subpixel apart. Read the corners, not the
 * edges. On Android the prop never arrives, so expect solid blue.
 */
const OverlayStage = styled.View`
  width: 180px;
  height: 180px;
`;

/** Radius intentionally larger than the tiles': the disagreement between
 *  the two curves grows with the radius, so the amplifier wants the most
 *  generous corner it can take while still leaving a straight edge. */
const OverlayFill = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  width: 180px;
  height: 180px;
  border-radius: 72px;
`;

const RoundUnder = styled(OverlayFill)`
  corner-shape: round;
  background-color: light-dark(#d4763c, #e0915e);
`;

const SquircleOver = styled(OverlayFill)`
  corner-shape: squircle;
  background-color: light-dark(#3451b2, #8da2f0);
`;

const Item = styled.View`
  align-items: center;
  gap: ${t.space.xs}px;
`;

/** The radius is a fifth of the side so `round` reads as a circular arc
 *  against visible straight edges. At a third the four arcs nearly meet,
 *  leaving almost no flat edge, and a circular corner reads as a squircle
 *  to the eye. That makes the reference tile untrustworthy, which matters
 *  more here than the sub-pixel contour delta a larger radius would add. */
const Tile = styled.View`
  width: 120px;
  height: 120px;
  border-radius: 24px;
`;

const RoundTile = styled(Tile)`
  corner-shape: round;
  background-color: light-dark(#d4763c, #e0915e);
`;

const SquircleTile = styled(Tile)`
  corner-shape: squircle;
  background-color: light-dark(#3451b2, #8da2f0);
`;

const SuperellipseTile = styled(Tile)`
  corner-shape: superellipse(2);
  background-color: light-dark(#2f7d4f, #79c89a);
`;

/** No native contour: the declaration drops with a dev warning. Drawn as
 *  an outline so an unrendered shape never reads as a rendered one. */
const ScoopTile = styled(Tile)`
  corner-shape: scoop;
  border-width: 2px;
  border-style: dashed;
  border-color: light-dark(#b04a4a, #e08b8b);
`;

/** The one exactly-rendered value. `square` is a 90deg convex corner,
 *  which a zero radius draws precisely, so this must look like a plain
 *  rectangle on every platform despite the 24px radius above it. */
const SquareTile = styled(Tile)`
  corner-shape: square;
  background-color: light-dark(#6b4fa8, #b49ae8);
`;

/** Squares two corners and leaves the other two round, which RN can only
 *  express because square resolves to a per-corner radius rather than to
 *  the single per-view `borderCurve`. Top-left and bottom-right go
 *  square; top-right and bottom-left keep the arc. */
const HalfSquareTile = styled(Tile)`
  corner-shape: square round;
  background-color: light-dark(#a8553f, #e0a08e);
`;

const TileLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.ink};
`;

const TileNote = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
`;

export function CornerShapeBoard() {
  return (
    <Stack>
      <Section>
        <SectionTitle>corner-shape</SectionTitle>
        <Markdown variant="hint">
          {`Blue \`squircle\` stacked on orange \`round\`, same size and radius, so orange shows only where the contours disagree. **On iOS look for a hairline at the shoulder of each corner**, fading to nothing at the diagonal: that is Apple's \`continuous\` curve being applied. It stays a hairline because \`continuous\` smooths curvature rather than squaring the corner, so it moves the outline about an eighth as far as a true \`superellipse(2)\` would. Android shows solid blue, since \`borderCurve\` is missing from its view config and the prop is dropped.`}
        </Markdown>
        <OverlayStage>
          <RoundUnder />
          <SquircleOver />
        </OverlayStage>
        <Markdown variant="hint">
          {`The tiles are an identity check rather than a shape comparison: \`superellipse(2)\` must match \`squircle\` exactly, since the spec defines one as the other, and \`scoop\` must stay an outline because it has no native contour and its declaration drops.`}
        </Markdown>
        <Row>
          <Item>
            <RoundTile />
            <TileLabel>round</TileLabel>
            <TileNote>circular</TileNote>
          </Item>
          <Item>
            <SquircleTile />
            <TileLabel>squircle</TileLabel>
            <TileNote>continuous</TileNote>
          </Item>
          <Item>
            <SuperellipseTile />
            <TileLabel>se(2)</TileLabel>
            <TileNote>== squircle</TileNote>
          </Item>
          <Item>
            <ScoopTile />
            <TileLabel>scoop</TileLabel>
            <TileNote>dropped</TileNote>
          </Item>
        </Row>
        <Markdown variant="hint">
          {`\`square\` is the one value React Native renders **exactly** rather than approximately, because the spec defines it as the corner \`border-radius: 0\` already draws. Both tiles below still declare a 24px radius, so any rounding that survives is a bug. It is also the only \`corner-shape\` value Android honors.`}
        </Markdown>
        <Row>
          <Item>
            <SquareTile />
            <TileLabel>square</TileLabel>
            <TileNote>radius 0</TileNote>
          </Item>
          <Item>
            <HalfSquareTile />
            <TileLabel>square round</TileLabel>
            <TileNote>TL/BR only</TileNote>
          </Item>
        </Row>
      </Section>
    </Stack>
  );
}
