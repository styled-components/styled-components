import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Grid = styled.View`
  gap: ${t.space.md}px;

  @media (min-aspect-ratio: 1/1) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const Tile = styled.View`
  background-color: ${t.colors.surface};
  border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.lg}px;
  padding: ${t.space.lg}px;
  align-items: center;
  justify-content: center;
  min-height: 120px;

  @media (max-aspect-ratio: 1/1) {
    flex-direction: row;
  }

  @media (min-aspect-ratio: 1/1) and (max-aspect-ratio: 4/3) {
    flex: 1 1 48%;
  }

  @media (min-aspect-ratio: 4/3) {
    flex: 1 1 30%;
  }
`;

const Tag = styled.Text`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: ${t.colors.accent};
  text-transform: uppercase;
`;

const Label = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: ${t.colors.fg};
  margin-top: 4px;
`;

const TILES = [1, 2, 3, 4, 5, 6];

/* CSS Sizing 4 §4.1 — element-level aspect-ratio. Each ratio tile takes
   the parent's full width and computes its height from the declared
   ratio. The visible proof is the height tracking the width: a 16:9
   tile is short; a 1:2 tile is tall. */
const RatioStack = styled.View`
  gap: ${t.space.sm}px;

  /* In row context use flex-start so each card's height derives from
     aspect-ratio × resolved width instead of stretching to match the
     tallest sibling. align-items defaults to stretch in column flex
     (mobile), which keeps cards full-width on the cross axis. */
  @media (min-aspect-ratio: 1/1) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }
`;

const RatioTag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};

  /* Span the full row when RatioStack flips to flex-direction: row so
     the label stacks above the ratio cards instead of competing with
     them for row space. */
  @media (min-aspect-ratio: 1/1) {
    flex-basis: 100%;
  }
`;

/* No explicit `width: 100%`. In flex column (mobile) the parent's
   default `align-items: stretch` already spans the cross axis; in flex
   row (landscape / desktop) the explicit `width: 100%` would override
   `flex-basis` and force one card per row, defeating the grid. */
const RatioCard = styled.View`
  background-color: ${t.colors.surfaceMuted};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  align-items: center;
  justify-content: center;

  @media (min-aspect-ratio: 1/1) {
    flex: 1 1 45%;
    min-width: 240px;
  }
  @media (min-aspect-ratio: 4/3) {
    flex: 1 1 30%;
    min-width: 200px;
  }
`;

const RatioLandscape = styled(RatioCard)`
  aspect-ratio: 16 / 9;
`;

const RatioSquare = styled(RatioCard)`
  aspect-ratio: 1;
`;

const RatioPortrait = styled(RatioCard)`
  aspect-ratio: 1 / 2;
`;

const RatioAutoExplicit = styled(RatioCard)`
  aspect-ratio: auto 3 / 1;
`;

const RatioLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fg};
`;

export function AspectRatioGallery() {
  return (
    <>
      <Grid>
        {TILES.map(n => (
          <Tile key={n}>
            <Tag>Tile {n}</Tag>
            <Label>·</Label>
          </Tile>
        ))}
      </Grid>
      <RatioStack>
        <RatioTag>aspect-ratio · §4.1</RatioTag>
        <RatioLandscape>
          <RatioLabel>16 / 9</RatioLabel>
        </RatioLandscape>
        <RatioSquare>
          <RatioLabel>1</RatioLabel>
        </RatioSquare>
        <RatioPortrait>
          <RatioLabel>1 / 2</RatioLabel>
        </RatioPortrait>
        <RatioAutoExplicit>
          <RatioLabel>auto 3 / 1</RatioLabel>
        </RatioAutoExplicit>
      </RatioStack>
    </>
  );
}
