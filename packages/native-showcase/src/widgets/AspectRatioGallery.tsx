import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Grid = styled.View`
  gap: ${t.space.sm}px;

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

export function AspectRatioGallery() {
  return (
    <Grid>
      {TILES.map(n => (
        <Tile key={n}>
          <Tag>Tile {n}</Tag>
          <Label>·</Label>
        </Tile>
      ))}
    </Grid>
  );
}
