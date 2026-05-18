import React from 'react';
import styled from 'styled-components/native';
import { Markdown } from '@/components/Markdown';
import { theme as t } from '@/theme/tokens';

/**
 * Viewport units. CSS Values L4 §6.1.2 defines six families:
 * • `vh` / `vw` - UA-default viewport
 * • `dvh` / `dvw` - dynamic, recomputes as URL bars hide
 * • `svh` / `svw` - small, assumes browser chrome is visible
 * • `lvh` / `lvw` - large, assumes chrome is collapsed
 * plus `vmin` / `vmax` derived from the smaller/larger axis.
 *
 * On rn-web all six resolve against the actual visual viewport, so
 * `dvh` shifts as iOS Safari shrinks. On native iOS / Android there is
 * no URL-bar surface - the viewport never changes height - so
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

const Bar = styled.View`
  height: 14px;
  background-color: ${t.colors.ink};
`;

/* Width-axis ladder: distinct multipliers so the resolver's output is
   visually obvious. Capped at 40vw so the longest bar still fits its
   row gracefully on desktop. */
const Bar10vw = styled(Bar)`
  width: 10vw;
`;
const Bar20vw = styled(Bar)`
  width: 20vw;
`;
const Bar30vw = styled(Bar)`
  width: 30vw;
`;
const Bar40vw = styled(Bar)`
  width: 40vw;
`;

/* Variant comparison: same multiplier across vw / dvw / svw / lvw.
   On native all four collapse to the same length (no URL-bar surface
   to differentiate); on rn-web `dvw` flexes as the visual viewport
   resizes. Bars are intentionally identical when the polyfill works
   on native - the note in the row body explains why. */
const Bar25vwVariant = styled(Bar)`
  width: 25vw;
`;
const Bar25dvwVariant = styled(Bar)`
  width: 25dvw;
`;
const Bar25svwVariant = styled(Bar)`
  width: 25svw;
`;
const Bar25lvwVariant = styled(Bar)`
  width: 25lvw;
`;

/* Derived axes. Multipliers chosen so the bars differ visibly. */
const BarVmin25 = styled(Bar)`
  width: 25vmin;
`;
const BarVmax25 = styled(Bar)`
  width: 25vmax;
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

const BarBox = styled.View`
  flex: 1;
`;

/* Height-axis ladder. Vertical bars at increasing multipliers; the
   row spreads them horizontally so the height differential is the
   readable variable. */
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

const Height4vh = styled(HeightBlock)`
  height: 4vh;
`;
const Height8vh = styled(HeightBlock)`
  height: 8vh;
`;
const Height12vh = styled(HeightBlock)`
  height: 12vh;
`;
const Height16vh = styled(HeightBlock)`
  height: 16vh;
`;

const HeightTag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.4px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

export function ViewportUnitsRibbon() {
  return (
    <Stack>
      <Row>
        <RowLabel>width axis · vw ladder</RowLabel>
        <Markdown variant="hint">
          Each bar's width is set in `vw` units. The four bars step up proportionally with the
          viewport - rotate the device or resize the browser to watch them re-resolve.
        </Markdown>
        <Frame>
          <BarRow>
            <BarTag>10vw</BarTag>
            <BarBox>
              <Bar10vw />
            </BarBox>
          </BarRow>
          <BarRow>
            <BarTag>20vw</BarTag>
            <BarBox>
              <Bar20vw />
            </BarBox>
          </BarRow>
          <BarRow>
            <BarTag>30vw</BarTag>
            <BarBox>
              <Bar30vw />
            </BarBox>
          </BarRow>
          <BarRow>
            <BarTag>40vw</BarTag>
            <BarBox>
              <Bar40vw />
            </BarBox>
          </BarRow>
        </Frame>
      </Row>

      <Row>
        <RowLabel>vw / dvw / svw / lvw variants</RowLabel>
        <Markdown variant="hint">
          Same `25 × [unit]` multiplier across the four variants. On iOS / Android all four bars
          share one length because there's no URL-bar surface to differentiate; on rn-web `dvw`
          flexes as the visual viewport resizes.
        </Markdown>
        <Frame>
          <BarRow>
            <BarTag>25vw</BarTag>
            <BarBox>
              <Bar25vwVariant />
            </BarBox>
          </BarRow>
          <BarRow>
            <BarTag>25dvw</BarTag>
            <BarBox>
              <Bar25dvwVariant />
            </BarBox>
          </BarRow>
          <BarRow>
            <BarTag>25svw</BarTag>
            <BarBox>
              <Bar25svwVariant />
            </BarBox>
          </BarRow>
          <BarRow>
            <BarTag>25lvw</BarTag>
            <BarBox>
              <Bar25lvwVariant />
            </BarBox>
          </BarRow>
        </Frame>
      </Row>

      <Row>
        <RowLabel>derived axes · vmin / vmax</RowLabel>
        <Markdown variant="hint">
          `vmin` resolves against the smaller viewport axis, `vmax` the larger. Both use the same
          `25 × [unit]` multiplier here; in portrait the `vmin` bar is shorter, in landscape they
          swap.
        </Markdown>
        <Frame>
          <BarRow>
            <BarTag>25 vmin</BarTag>
            <BarBox>
              <BarVmin25 />
            </BarBox>
          </BarRow>
          <BarRow>
            <BarTag>25 vmax</BarTag>
            <BarBox>
              <BarVmax25 />
            </BarBox>
          </BarRow>
        </Frame>
      </Row>

      <Row>
        <RowLabel>height axis · vh ladder</RowLabel>
        <Markdown variant="hint">
          Each column is `height: N × vh`. The blocks step up taller as the multiplier grows.
        </Markdown>
        <Frame>
          <HeightRow>
            <HeightCol>
              <Height4vh />
              <HeightTag>4vh</HeightTag>
            </HeightCol>
            <HeightCol>
              <Height8vh />
              <HeightTag>8vh</HeightTag>
            </HeightCol>
            <HeightCol>
              <Height12vh />
              <HeightTag>12vh</HeightTag>
            </HeightCol>
            <HeightCol>
              <Height16vh />
              <HeightTag>16vh</HeightTag>
            </HeightCol>
          </HeightRow>
        </Frame>
      </Row>

      <Markdown variant="hint">
        On iOS / Android `dvh` / `svh` / `lvh` resolve to the same value as `vh`; in a mobile
        browser they differ as Safari hides chrome on scroll.
      </Markdown>
    </Stack>
  );
}
