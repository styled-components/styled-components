import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * CSS scroll-driven animations: every motion here is bound to the
 * scroll position of the inner scroller, not to a clock. Drag slowly
 * and everything advances with your finger; let go mid-scroll and the
 * whole scene freezes in place. That freeze is the proof the timeline
 * is the scroll offset.
 */

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
`;

const Stage = styled.ScrollView`
  height: 280px;
  border-width: ${t.borderWidth.hairline}px;
  border-color: ${t.colors.border};
  border-radius: ${t.radius.md}px;
`;

const Content = styled.View`
  padding: ${t.space.md}px;
  gap: ${t.space.lg}px;
`;

/**
 * Grows with overall scroll progress; a scroll-position gauge. Scales
 * (instead of animating width) so the keyframes are native-driver
 * eligible and the bar rides the UI thread, keeping exact pace with the
 * finger like the natively-stuck header above it.
 */
const ProgressBar = styled.View`
  height: 10px;
  border-radius: 5px;
  background-color: light-dark(#3451b2, #8da2f0);
  transform-origin: left;
  animation: story-progress linear both;
  animation-timeline: scroll();
  @keyframes story-progress {
    from {
      transform: scaleX(0.04);
    }
    to {
      transform: scaleX(1);
    }
  }
`;

/** Hue sweeps across the full scroll range (Oklab color interpolation). */
const HueDial = styled.View`
  height: 56px;
  border-radius: ${t.radius.md}px;
  animation: story-hue linear both;
  animation-timeline: scroll();
  @keyframes story-hue {
    from {
      background-color: #d4763c;
    }
    to {
      background-color: #3c7bd4;
    }
  }
`;

/** Inflates through the middle half of the scroll only (animation-range). */
const Balloon = styled.View`
  width: 72px;
  height: 72px;
  align-self: center;
  border-radius: 36px;
  background-color: light-dark(#2f7d4f, #79c89a);
  animation: story-balloon linear both;
  animation-timeline: scroll();
  animation-range: 25% 75%;
  @keyframes story-balloon {
    from {
      transform: scale(0.45);
    }
    to {
      transform: scale(1.35);
    }
  }
`;

/** Each band fades in over its own slice of the scroll range. */
const Band = styled.View`
  height: 48px;
  border-radius: ${t.radius.sm}px;
  background-color: ${t.colors.ink};
`;
const BandEarly = styled(Band)`
  animation: story-reveal linear both;
  animation-timeline: scroll();
  animation-range: 5% 35%;
  @keyframes story-reveal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
const BandMid = styled(Band)`
  animation: story-reveal linear both;
  animation-timeline: scroll();
  animation-range: 35% 65%;
  @keyframes story-reveal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
const BandLate = styled(Band)`
  animation: story-reveal linear both;
  animation-timeline: scroll();
  animation-range: 65% 95%;
  @keyframes story-reveal {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/**
 * Sticks to the top of the scroller. `top: 0` is load-bearing for the
 * browser: per CSS positioning a sticky box with all insets auto never
 * offsets, so without it the header scrolls away on web. The native
 * lift pins to the top edge either way.
 */
const StickyHeader = styled.View`
  position: sticky;
  top: 0;
  /* rn-web gives every View z-index: 0, so without this the story
     content paints over the stuck header as it scrolls under it. */
  z-index: 1;
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: light-dark(#eef1f8, #232838);
  border-radius: ${t.radius.sm}px;
`;

const StickyLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.ink};
`;

const Spacer = styled.View`
  height: 120px;
`;

/**
 * view() reveal cards: each card animates over ITS OWN visibility, not
 * an absolute slice of the scroll range, so the effect follows the card
 * wherever it sits in the page. Subjects must be direct children of the
 * scroller (the polyfill reads their layout relative to the content),
 * which is why these sit outside the padded Content wrapper.
 */
const ViewCard = styled.View`
  height: 64px;
  margin: 0 ${t.space.md}px ${t.space.lg}px;
  border-radius: ${t.radius.md}px;
  align-items: center;
  justify-content: center;
  background-color: light-dark(#3451b2, #8da2f0);
  animation: view-reveal linear both;
  animation-timeline: view();
  animation-range: entry;
  @keyframes view-reveal {
    from {
      opacity: 0;
      transform: translateX(-48px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(0px) scale(1);
    }
  }
`;

const ViewCardLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: light-dark(#f5f3ee, #10131c);
`;

const Footnote = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.brief}px;
  color: ${t.colors.fgMuted};
  text-align: center;
`;

export function ScrollStory() {
  return (
    <Stack>
      <Caption>animation-timeline: scroll() / view() + animation-range</Caption>
      <Stage>
        <StickyHeader>
          <StickyLabel>position: sticky (stays while the story scrolls)</StickyLabel>
        </StickyHeader>
        <Content>
          <ProgressBar />
          <HueDial />
          <BandEarly />
          <Balloon />
          <BandMid />
          <Spacer />
          <BandLate />
          <Footnote>release mid-scroll: the scene freezes with your finger</Footnote>
        </Content>
        <ViewCard>
          <ViewCardLabel>view() · slides in as it enters</ViewCardLabel>
        </ViewCard>
        <ViewCard>
          <ViewCardLabel>each card tracks its own visibility</ViewCardLabel>
        </ViewCard>
        <ViewCard>
          <ViewCardLabel>animation-range: entry</ViewCardLabel>
        </ViewCard>
        <Content>
          <Spacer />
        </Content>
      </Stage>
    </Stack>
  );
}
