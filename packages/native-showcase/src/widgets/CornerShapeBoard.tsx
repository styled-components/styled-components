import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * corner-shape: round vs squircle at the same border-radius. The two
 * large squares overlap with contrasting tints, so the smoothing delta
 * shows as colored crescents at every corner (Apple's continuous curve
 * trims the shoulder where a circular radius bulges). iOS renders the
 * difference; Android draws both circular and warns once, and that
 * uniform pair IS the Android demo. The scoop tile has no native
 * contour: it warns and renders default corners here, while Chrome
 * 139+ scoops it for real.
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

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
`;

const OverlapStage = styled.View`
  height: 150px;
`;

const RoundSquare = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  width: 140px;
  height: 140px;
  border-radius: 44px;
  corner-shape: round;
  background-color: light-dark(#d4763c, #e0915e);
`;

const SquircleSquare = styled.View`
  position: absolute;
  top: 5px;
  left: 5px;
  width: 130px;
  height: 130px;
  border-radius: 40px;
  corner-shape: squircle;
  background-color: light-dark(#3451b2, #8da2f0);
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.md}px;
`;

const Tile = styled.View`
  width: 84px;
  height: 84px;
  border-radius: 28px;
  align-items: center;
  justify-content: center;
`;

const SuperellipseTile = styled(Tile)`
  corner-shape: superellipse(2);
  background-color: light-dark(#2f7d4f, #79c89a);
`;

/** No native contour: warns in dev and renders default corners; Chrome scoops. */
const ScoopTile = styled(Tile)`
  corner-shape: scoop;
  background-color: light-dark(#b04a4a, #e08b8b);
`;

const TileLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: light-dark(#ffffff, #10131c);
`;

export function CornerShapeBoard() {
  return (
    <Stack>
      <Section>
        <SectionTitle>round vs squircle</SectionTitle>
        <Caption>same radius; the crescents at each corner are the smoothing delta (iOS)</Caption>
        <OverlapStage>
          <RoundSquare />
          <SquircleSquare />
        </OverlapStage>
      </Section>
      <Section>
        <SectionTitle>superellipse() and unsupported contours</SectionTitle>
        <Caption>superellipse(2) maps to the Apple curve; scoop warns and stays default</Caption>
        <Row>
          <SuperellipseTile>
            <TileLabel>se(2)</TileLabel>
          </SuperellipseTile>
          <ScoopTile>
            <TileLabel>scoop</TileLabel>
          </ScoopTile>
        </Row>
      </Section>
    </Stack>
  );
}
