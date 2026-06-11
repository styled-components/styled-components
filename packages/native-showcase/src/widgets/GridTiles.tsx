import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Real `display: grid` on React Native. The Grid container declares
 * `display: grid; grid-template-columns: repeat(3, 1fr); gap`, and each
 * Tile sizes itself from the measured container width. The wide tile
 * declares `grid-column: span 2` and visibly spans two columns, so a
 * correct render shows an even 3-column lattice with one double-width
 * cell. On rn-web the browser lays out the grid natively.
 */
const Grid = styled.View`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${t.space.xs}px;
  padding: ${t.space.xs}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

const Tile = styled.View`
  height: 64px;
  align-items: center;
  justify-content: center;
  background-color: light-dark(#dfe6f5, #2a3350);
`;

const Wide = styled(Tile)`
  grid-column: span 2;
  background-color: light-dark(#0e0e10, #f5f3ee);
`;

const Num = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.title}px;
  color: light-dark(#0e0e10, #f5f3ee);
`;

const WideNum = styled(Num)`
  color: light-dark(#f5f3ee, #0e0e10);
`;

const Label = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: light-dark(#f5f3ee, #0e0e10);
`;

export function GridTiles() {
  return (
    <Grid>
      <Tile>
        <Num>1</Num>
      </Tile>
      <Wide>
        <WideNum>2</WideNum>
        <Label>span 2</Label>
      </Wide>
      <Tile>
        <Num>3</Num>
      </Tile>
      <Tile>
        <Num>4</Num>
      </Tile>
      <Tile>
        <Num>5</Num>
      </Tile>
      <Tile>
        <Num>6</Num>
      </Tile>
      <Tile>
        <Num>7</Num>
      </Tile>
      <Tile>
        <Num>8</Num>
      </Tile>
    </Grid>
  );
}
