import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * CSS Color 4 §6.2 — UA / platform system colors. Each keyword folds
 * to a `light-dark()` expression carrying sensible per-mode literals;
 * the polyfill flips light↔dark with the device scheme on iOS /
 * Android, and rn-web hands the function to the browser directly.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.borderWidth.hairline}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

const Tile = styled.View`
  flex: 1;
  height: 72px;
  align-items: center;
  justify-content: center;
`;

const TileLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.4px;
`;

const Section = styled.View`
  gap: ${t.space.xs}px;
`;

const SectionTitle = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

// Surfaces (background tiles using each surface keyword as bg-color
// and the matching foreground keyword as text color, so the pair
// is exercised together).
const CanvasTile = styled(Tile)`
  background-color: Canvas;
`;
const CanvasTextLabel = styled(TileLabel)`
  color: CanvasText;
`;

const FieldTile = styled(Tile)`
  background-color: Field;
`;
const FieldTextLabel = styled(TileLabel)`
  color: FieldText;
`;

const HighlightTile = styled(Tile)`
  background-color: Highlight;
`;
const HighlightTextLabel = styled(TileLabel)`
  color: HighlightText;
`;

// Text-only tiles (use a neutral background to read the foreground keyword).
const NeutralTile = styled(Tile)`
  background-color: Canvas;
`;
const GrayTextLabel = styled(TileLabel)`
  color: GrayText;
`;
const LinkTextLabel = styled(TileLabel)`
  color: LinkText;
`;
const VisitedTextLabel = styled(TileLabel)`
  color: VisitedText;
`;
const ActiveTextLabel = styled(TileLabel)`
  color: ActiveText;
`;

export function SystemColorsBoard() {
  return (
    <Stack>
      <Section>
        <SectionTitle>surfaces · canvas / canvastext</SectionTitle>
        <Row>
          <CanvasTile>
            <CanvasTextLabel>Canvas</CanvasTextLabel>
          </CanvasTile>
          <FieldTile>
            <FieldTextLabel>Field</FieldTextLabel>
          </FieldTile>
          <HighlightTile>
            <HighlightTextLabel>Highlight</HighlightTextLabel>
          </HighlightTile>
        </Row>
      </Section>
      <Section>
        <SectionTitle>text accents</SectionTitle>
        <Row>
          <NeutralTile>
            <GrayTextLabel>GrayText</GrayTextLabel>
          </NeutralTile>
          <NeutralTile>
            <LinkTextLabel>LinkText</LinkTextLabel>
          </NeutralTile>
          <NeutralTile>
            <VisitedTextLabel>VisitedText</VisitedTextLabel>
          </NeutralTile>
          <NeutralTile>
            <ActiveTextLabel>ActiveText</ActiveTextLabel>
          </NeutralTile>
        </Row>
      </Section>
    </Stack>
  );
}
