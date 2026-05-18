import React, { useRef, useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const MIN_W = 200;
const MAX_W = 480;
const INITIAL_W = 260;

const Wrapper = styled.View`
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.sm}px;
  gap: ${t.space.sm}px;

  @container (min-width: 320px) {
    flex-direction: row;
    align-items: center;
    gap: ${t.space.md}px;
  }
`;

const Avatar = styled.View`
  width: 48px;
  height: 48px;
  background-color: ${t.colors.ink};
  align-items: center;
  justify-content: center;

  @container (min-width: 320px) {
    width: 56px;
    height: 56px;
  }
`;

const Initial = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: 18px;
  color: ${t.colors.bg};
`;

const Body = styled.View`
  gap: 2px;

  @container (min-width: 320px) {
    flex: 1;
  }
`;

const Name = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: 16px;
  color: ${t.colors.ink};
`;

const Subtitle = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const Action = styled.Pressable`
  align-self: flex-start;
  padding: 6px 12px;
  background-color: ${t.colors.ink};

  @container (min-width: 320px) {
    align-self: center;
  }
`;

const ActionLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  color: ${t.colors.bg};
  text-transform: uppercase;
`;

// Positioning shell + container host. Owns the controlled width and
// publishes itself as the @container ancestor that Wrapper / Avatar /
// Body read from. The container-type lives here (not on Wrapper)
// because CSS forbids an element from matching its own @container
// query - the row-mode rules need to query an ancestor, so the bare
// container has to live one level above the layout element.
//
// `align-self: flex-start` lets the stage track its inline-styled
// width instead of being stretched by the parent's `align-items: stretch`.
const Stage = styled.View`
  align-self: flex-start;
  position: relative;
  container-type: inline-size;
`;

// Drag handle hangs off the right edge so it's grabbable without
// obscuring the card. `cursor` and `user-select` are no-ops on iOS /
// Android; they only matter for rn-web. `touch-action: none` keeps
// the browser from claiming horizontal swipes for page scrolling
// before the responder system can.
const Handle = styled.View`
  position: absolute;
  top: 0;
  right: -10px;
  bottom: 0;
  width: 20px;
  align-items: center;
  justify-content: center;
  z-index: 1;
  cursor: ew-resize;
  user-select: none;
  touch-action: none;
`;

const HandleGrip = styled.View<{ $active: boolean }>`
  width: 4px;
  height: 36px;
  background-color: ${t.colors.fgMuted};
  border-radius: ${t.radius.pill}px;

  &[data-active='true'] {
    background-color: ${t.colors.ink};
  }
`;

export function ContainerQueryCard() {
  const [width, setWidth] = useState(INITIAL_W);
  const [active, setActive] = useState(false);
  const draggingRef = useRef<{ startX: number; startW: number } | null>(null);

  return (
    <Stage style={{ width }}>
      <Wrapper>
        <Avatar>
          <Initial>EJ</Initial>
        </Avatar>
        <Body>
          <Name>Evan Jacobs</Name>
          <Subtitle>Open source</Subtitle>
        </Body>
        <Action accessibilityRole="button">
          <ActionLabel>Follow</ActionLabel>
        </Action>
      </Wrapper>
      <Handle
        accessibilityLabel="Drag to resize container"
        accessibilityHint={`Width is ${Math.round(width)} pixels. Drag horizontally to change.`}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={e => {
          draggingRef.current = { startX: e.nativeEvent.pageX, startW: width };
          setActive(true);
        }}
        onResponderMove={e => {
          const dragging = draggingRef.current;
          if (!dragging) return;
          const delta = e.nativeEvent.pageX - dragging.startX;
          const next = Math.max(MIN_W, Math.min(MAX_W, dragging.startW + delta));
          setWidth(next);
        }}
        onResponderRelease={() => {
          draggingRef.current = null;
          setActive(false);
        }}
        onResponderTerminate={() => {
          draggingRef.current = null;
          setActive(false);
        }}
      >
        <HandleGrip $active={active} data-active={String(active)} />
      </Handle>
    </Stage>
  );
}
