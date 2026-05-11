import React from 'react';
import { useWindowDimensions } from 'react-native';
import styled from 'styled-components/native';
import { Markdown } from '@/components/Markdown';
import { theme as t } from '@/theme/tokens';

/**
 * Viewport units. CSS Values L4 §6.1.2 defines six families:
 * • `vh` / `vw` — UA-default viewport
 * • `dvh` / `dvw` — dynamic, recomputes as URL bars hide
 * • `svh` / `svw` — small, assumes browser chrome is visible
 * • `lvh` / `lvw` — large, assumes chrome is collapsed
 * plus `vmin` / `vmax` derived from the smaller/larger axis.
 *
 * On rn-web all six resolve against the actual visual viewport, so
 * `dvh` shifts as iOS Safari shrinks. On native iOS / Android there is
 * no URL-bar surface — the viewport never changes height — so
 * `dvh` / `svh` / `lvh` all collapse to a single value. The bars below
 * make that collapse explicit.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
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

const Frame = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surfaceMuted};
  padding: ${t.space.xs}px;
  gap: ${t.space.xxs}px;
`;

// Horizontal bars. The viewport-unit declaration is the load-bearing
// part; an explicit number-of-pixel readout sits next to each so the
// resolved size is visible at a glance.
const Bar = styled.View`
  height: 14px;
  background-color: ${t.colors.ink};
`;

const BarVw20 = styled(Bar)`
  width: 20vw;
`;
const BarDvw20 = styled(Bar)`
  width: 20dvw;
`;
const BarSvw20 = styled(Bar)`
  width: 20svw;
`;
const BarLvw20 = styled(Bar)`
  width: 20lvw;
`;
const BarVmin25 = styled(Bar)`
  width: 25vmin;
`;
const BarVmax15 = styled(Bar)`
  width: 15vmax;
`;

const BarRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
`;

const BarTag = styled.Text`
  width: 64px;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.4px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

const BarReadout = styled.Text`
  width: 56px;
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
  text-align: right;
`;

const BarBox = styled.View`
  flex: 1;
`;

// Vertical-unit demo. Each block reserves a `*vh` height; the column
// holds them side by side so the user can compare directly.
const HeightRow = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
  align-items: flex-end;
`;

const HeightCol = styled.View`
  flex: 1;
  align-items: center;
  gap: ${t.space.xxs}px;
`;

const HeightBlock = styled.View`
  width: 100%;
  background-color: ${t.colors.signalSoft};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

const HeightVh = styled(HeightBlock)`
  height: 8vh;
`;
const HeightDvh = styled(HeightBlock)`
  height: 8dvh;
`;
const HeightSvh = styled(HeightBlock)`
  height: 8svh;
`;
const HeightLvh = styled(HeightBlock)`
  height: 8lvh;
`;

const HeightTag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.4px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

const HeightReadout = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

export function ViewportUnitsRibbon() {
  const { width, height } = useWindowDimensions();
  const fmt = (px: number) => px.toFixed(0) + 'px';
  // Width-axis readouts.
  const w20 = (width * 20) / 100;
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  const vmin25 = (min * 25) / 100;
  const vmax15 = (max * 15) / 100;
  // Height-axis readouts.
  const h8 = (height * 8) / 100;

  return (
    <Stack>
      <Row>
        <RowLabel>width axis · 20 [unit]</RowLabel>
        <Markdown variant="hint">
          On rn-web `dvw` flexes with the visual viewport; on native all four collapse.
        </Markdown>
        <Frame>
          <BarRow>
            <BarTag>vw</BarTag>
            <BarBox>
              <BarVw20 />
            </BarBox>
            <BarReadout>{fmt(w20)}</BarReadout>
          </BarRow>
          <BarRow>
            <BarTag>dvw</BarTag>
            <BarBox>
              <BarDvw20 />
            </BarBox>
            <BarReadout>{fmt(w20)}</BarReadout>
          </BarRow>
          <BarRow>
            <BarTag>svw</BarTag>
            <BarBox>
              <BarSvw20 />
            </BarBox>
            <BarReadout>{fmt(w20)}</BarReadout>
          </BarRow>
          <BarRow>
            <BarTag>lvw</BarTag>
            <BarBox>
              <BarLvw20 />
            </BarBox>
            <BarReadout>{fmt(w20)}</BarReadout>
          </BarRow>
        </Frame>
      </Row>
      <Row>
        <RowLabel>derived axes · vmin / vmax</RowLabel>
        <Markdown variant="hint">vmin uses the smaller axis, vmax the larger.</Markdown>
        <Frame>
          <BarRow>
            <BarTag>25 vmin</BarTag>
            <BarBox>
              <BarVmin25 />
            </BarBox>
            <BarReadout>{fmt(vmin25)}</BarReadout>
          </BarRow>
          <BarRow>
            <BarTag>15 vmax</BarTag>
            <BarBox>
              <BarVmax15 />
            </BarBox>
            <BarReadout>{fmt(vmax15)}</BarReadout>
          </BarRow>
        </Frame>
      </Row>
      <Row>
        <RowLabel>height axis · 8 [unit]</RowLabel>
        <Markdown variant="hint">
          Each column is `height: 8[unit]vh`. Equal heights = no URL-bar collapse.
        </Markdown>
        <Frame>
          <HeightRow>
            <HeightCol>
              <HeightVh />
              <HeightTag>vh</HeightTag>
              <HeightReadout>{fmt(h8)}</HeightReadout>
            </HeightCol>
            <HeightCol>
              <HeightDvh />
              <HeightTag>dvh</HeightTag>
              <HeightReadout>{fmt(h8)}</HeightReadout>
            </HeightCol>
            <HeightCol>
              <HeightSvh />
              <HeightTag>svh</HeightTag>
              <HeightReadout>{fmt(h8)}</HeightReadout>
            </HeightCol>
            <HeightCol>
              <HeightLvh />
              <HeightTag>lvh</HeightTag>
              <HeightReadout>{fmt(h8)}</HeightReadout>
            </HeightCol>
          </HeightRow>
        </Frame>
      </Row>
      <Markdown variant="hint">
        On iOS / Android there's no URL-bar surface, so `dvh` / `svh` / `lvh` resolve
        to `vh`. In a mobile browser they differ as Safari hides chrome on scroll.
      </Markdown>
    </Stack>
  );
}
