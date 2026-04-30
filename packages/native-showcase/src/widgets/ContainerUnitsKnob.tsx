import React, { useState } from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

const MIN_W = 180;
const MAX_W = 360;
const TRACK_HEIGHT = 28;

const Container = styled.View<{ $containerName: 'knob' }>`
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: 6cqw 4cqw;
  align-items: center;
  justify-content: center;
  gap: 1cqw;
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
  height: ${MAX_W * 0.55}px;
  align-self: flex-start;
  justify-content: flex-start;
`;

const Track = styled.View`
  height: ${TRACK_HEIGHT}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
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

export function ContainerUnitsKnob() {
  const [trackWidth, setTrackWidth] = useState(0);
  const [width, setWidth] = useState((MIN_W + MAX_W) / 2);

  const widthFromX = (x: number) => {
    if (trackWidth <= 0) return width;
    const pct = Math.max(0, Math.min(1, x / trackWidth));
    return MIN_W + pct * (MAX_W - MIN_W);
  };

  const handlePos = trackWidth > 0 ? ((width - MIN_W) / (MAX_W - MIN_W)) * trackWidth : 0;
  const cqwPx = (width * 12) / 100;

  return (
    <>
      <StateReadout
        entries={[
          { key: 'container.width', value: `${Math.round(width)}px` },
          { key: 'rule', value: 'font-size: 12cqw' },
          { key: 'computed', value: `${cqwPx.toFixed(1)}px` },
        ]}
        badge={{ tone: 'neutral', label: 'LIVE · drag the handle' }}
      />
      <View
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={e => setWidth(widthFromX(e.nativeEvent.locationX))}
        onResponderMove={e => setWidth(widthFromX(e.nativeEvent.locationX))}
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
      </View>
      <StageFrame>
        <View style={{ width }}>
          <Container $containerName="knob">
            <Headline>Bigger box, bigger type</Headline>
            <Footnote>font-size: 12cqw → {cqwPx.toFixed(1)}px</Footnote>
          </Container>
        </View>
      </StageFrame>
    </>
  );
}
