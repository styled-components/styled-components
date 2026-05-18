import React, { useRef, useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const MIN_W = 180;
const MAX_W = 360;
const TRACK_HEIGHT = 28;
// Reserve the worst-case Container height so dragging the knob never
// pushes content below the widget. At MAX_W the Container resolves to
// padding-y (12cqw) + 3-line headline (13cqw × 3) + gap (1cqw) +
// footnote (~5cqw) ≈ 0.57 × MAX_W ≈ 205px. Add ~14% for native
// line-height rounding and font-metric variance across iOS / Android /
// rn-web. Keeping it constant means the slot height doesn't jump as
// the user drags.
const STAGE_HEIGHT = Math.ceil(MAX_W * 0.57 * 1.14);

const Container = styled.View`
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: 6cqw 4cqw;
  align-items: center;
  justify-content: center;
  gap: 1cqw;
  container-type: inline-size;
`;

const Headline = styled.Text`
  font-family: ${t.fontFamily.heading};
  color: ${t.colors.ink};
  font-size: 11cqw;
  line-height: 13cqw;
  text-align: center;
  letter-spacing: -0.5px;
`;

const Footnote = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: 3.5cqw;
  color: ${t.colors.fgMuted};
  text-align: center;
  letter-spacing: 0.5px;
`;

const StageFrame = styled.View`
  width: ${MAX_W}px;
  height: ${STAGE_HEIGHT}px;
  align-self: flex-start;
  justify-content: flex-start;
`;

// Bare width-carrier between StageFrame and the cq-unit Container.
// Keeps the inline `width` prop on a non-container element so
// Container's own cq-unit declarations (padding, gap) resolve cleanly
// against itself - putting `width` on Container and conflating the
// roles can subtly change how cq-units resolve on the principal box.
const Stage = styled.View``;

const Track = styled.View`
  height: ${TRACK_HEIGHT}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
`;

const Fill = styled.View`
  height: ${TRACK_HEIGHT - 2}px;
  background-color: ${t.colors.signalSoft};
`;

const HandleBar = styled.View`
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 6px;
  background-color: ${t.colors.ink};
`;

const TrackLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgFaint};
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const TrackBounds = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 4px;
`;

// Drag pad. `cursor: ew-resize` is web-only (rn-web reads it via the
// React Native style → CSS bridge); iOS / Android ignore it. The
// `touch-action: none` keeps the browser from claiming horizontal
// swipes for page scroll while a drag is in progress.
const DragPad = styled.View`
  cursor: ew-resize;
  touch-action: none;
  user-select: none;
`;

export function ContainerUnitsKnob() {
  const [trackWidth, setTrackWidth] = useState(0);
  const [width, setWidth] = useState((MIN_W + MAX_W) / 2);
  // Drag origin recorded at responder grant. Tracking against absolute
  // `pageX` deltas - rather than per-frame `locationX` - keeps the knob
  // live for the full press lifetime even when the cursor slides past
  // the track edges or off the view entirely. `locationX` is computed
  // from the responder view's bounding box, which gets unreliable on
  // rn-web once the pointer leaves; `pageX` flows from the underlying
  // pointer event regardless of hit target.
  const dragRef = useRef<{ pageX: number; width: number } | null>(null);

  const widthFromX = (x: number) => {
    if (trackWidth <= 0) return width;
    const pct = Math.max(0, Math.min(1, x / trackWidth));
    return MIN_W + pct * (MAX_W - MIN_W);
  };

  const clampWidth = (w: number) => Math.max(MIN_W, Math.min(MAX_W, w));

  const handlePos = trackWidth > 0 ? ((width - MIN_W) / (MAX_W - MIN_W)) * trackWidth : 0;
  const cqwPx = (width * 12) / 100;

  return (
    <>
      <DragPad
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        // Refuse termination so a parent ScrollView can't steal the
        // gesture mid-drag.
        onResponderTerminationRequest={() => false}
        onResponderGrant={e => {
          const next = widthFromX(e.nativeEvent.locationX);
          setWidth(next);
          dragRef.current = { pageX: e.nativeEvent.pageX, width: next };
        }}
        onResponderMove={e => {
          const origin = dragRef.current;
          if (!origin || trackWidth <= 0) return;
          const delta = e.nativeEvent.pageX - origin.pageX;
          setWidth(clampWidth(origin.width + (delta * (MAX_W - MIN_W)) / trackWidth));
        }}
        onResponderRelease={() => {
          dragRef.current = null;
        }}
        onResponderTerminate={() => {
          dragRef.current = null;
        }}
      >
        <Track>
          <Fill style={{ width: Math.max(0, handlePos - 1) }} />
        </Track>
        <HandleBar
          pointerEvents="none"
          style={{ left: Math.max(-1, Math.min(handlePos - 3, trackWidth - 5)) }}
        />
        <TrackBounds>
          <TrackLabel>{MIN_W}px</TrackLabel>
          <TrackLabel>{MAX_W}px</TrackLabel>
        </TrackBounds>
      </DragPad>
      <StageFrame>
        <Stage style={{ width }}>
          <Container>
            <Headline>Bigger box, bigger type</Headline>
            <Footnote>font-size: 12cqw → {cqwPx.toFixed(1)}px</Footnote>
          </Container>
        </Stage>
      </StageFrame>
    </>
  );
}
