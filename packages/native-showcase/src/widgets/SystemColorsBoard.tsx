import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * CSS Color 4 §6.2 — UA / platform system colors. Each keyword folds
 * to the native platform color surface on iOS / Android, and rn-web
 * hands the keyword to the browser directly.
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

const AccentTile = styled(Tile)`
  background-color: AccentColor;
`;
const AccentColorTextLabel = styled(TileLabel)`
  color: AccentColorText;
`;

const SelectedItemTile = styled(Tile)`
  background-color: SelectedItem;
`;
const SelectedItemTextLabel = styled(TileLabel)`
  color: SelectedItemText;
`;

const ButtonTile = styled(Tile)`
  background-color: ButtonFace;
  border: 4px solid ButtonBorder;
`;
const ButtonTextLabel = styled(TileLabel)`
  color: ButtonText;
`;

const MarkTile = styled(Tile)`
  background-color: Mark;
`;
const MarkTextLabel = styled(TileLabel)`
  color: MarkText;
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
          <AccentTile>
            <AccentColorTextLabel>Accent</AccentColorTextLabel>
          </AccentTile>
        </Row>
      </Section>
      <Section>
        <SectionTitle>state surfaces · selected / button / mark</SectionTitle>
        <Row>
          <SelectedItemTile>
            <SelectedItemTextLabel>SelectedItem</SelectedItemTextLabel>
          </SelectedItemTile>
          <ButtonTile>
            <ButtonTextLabel>ButtonFace</ButtonTextLabel>
          </ButtonTile>
          <MarkTile>
            <MarkTextLabel>Mark</MarkTextLabel>
          </MarkTile>
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
