import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * CSS Writing Modes 4 §2.1 (direction) + Display 4 §2.5 (display:contents)
 * + Position 3 §2 (position:static) + Text 3 §6.1 (text-align: start | end).
 * Every row proves the polyfill via rendered behavior (movement, layout,
 * alignment) — not via paint color labels.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;

  @media (min-aspect-ratio: 1/1) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const Row = styled.View`
  gap: ${t.space.xs}px;

  @media (min-aspect-ratio: 1/1) {
    flex: 1 1 45%;
    min-width: 280px;
  }
  @media (min-aspect-ratio: 4/3) {
    flex: 1 1 30%;
    min-width: 240px;
  }
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const ToggleRow = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
`;

const Toggle = styled.Pressable`
  align-self: flex-start;
  padding: 5px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};

  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
  }
`;

const ToggleLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.8px;
  color: ${t.colors.ink};
  text-transform: uppercase;

  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }
`;

/* direction row — the box visibly jumps to the opposite edge under rtl. */

const DirectionalFrame = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surface};

  &[data-dir='ltr'] {
    direction: ltr;
  }
  &[data-dir='rtl'] {
    direction: rtl;
  }
`;

const InlineStartBox = styled.View`
  align-self: flex-start;
  margin-inline-start: ${t.space.lg}px;
  background-color: ${t.colors.ink};
  padding: ${t.space.xs}px ${t.space.sm}px;
`;

const InlineStartLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.bg};
`;

/* display:contents row — the wrapper has loud padding + border declared.
   Under working `display: contents`, the wrapper generates no box, so
   the padding/border/background do not render and the children pack
   flush in the parent's flex flow. Under a broken polyfill, the bright
   wrapper chrome appears around the children. */

const ContentsFrame = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.xs}px;
  background-color: ${t.colors.surface};
  gap: ${t.space.xs}px;
`;

const ContentsWrapper = styled.View`
  display: contents;
  background-color: ${t.colors.fail};
  border: ${t.borderWidth.heavy}px solid ${t.colors.fail};
  padding: ${t.space.lg}px;
  gap: ${t.space.lg}px;
`;

const ContentsChild = styled.View`
  background-color: ${t.colors.ink};
  padding: ${t.space.xs}px ${t.space.sm}px;
`;

const ContentsChildLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.bg};
`;

/* position:static row — the static parent does NOT establish a containing
   block, so the inner `position: absolute` resolves against the next
   non-static ancestor (the outer Anchor). Under a working passthrough,
   the dot pins to the outer frame's top-right. Under a broken behavior,
   the dot would pin to the static box's top-right (visibly inset). */

const Anchor = styled.View`
  position: relative;
  height: 96px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surface};
`;

const StaticInner = styled.View`
  position: static;
  margin: ${t.space.lg}px;
  height: 40px;
  background-color: ${t.colors.surfaceMuted};
  justify-content: center;
  padding: 0 ${t.space.sm}px;
`;

const StaticLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.ink};
`;

const PinnedDot = styled.View`
  position: absolute;
  top: ${t.space.xs}px;
  right: ${t.space.xs}px;
  width: 14px;
  height: 14px;
  background-color: ${t.colors.ink};
`;

/* text-align row — glyph alignment within neutral surface containers. */

const AlignFrame = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.xs}px;
  background-color: ${t.colors.surface};
  gap: ${t.space.xs}px;
`;

const AlignText = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
`;

const AlignStart = styled(AlignText)`
  text-align: start;
`;

const AlignEnd = styled(AlignText)`
  text-align: end;
`;

const AlignLeft = styled(AlignText)`
  text-align: left;
`;

const AlignRight = styled(AlignText)`
  text-align: right;
`;

export function DirectionBoard() {
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');
  return (
    <Stack>
      <Row>
        <Tag>direction · §2.1</Tag>
        <ToggleRow>
          {(['ltr', 'rtl'] as const).map(value => {
            const pressed = dir === value;
            return (
              <Toggle key={value} aria-pressed={pressed} onPress={() => setDir(value)}>
                <ToggleLabel aria-pressed={pressed}>{value.toUpperCase()}</ToggleLabel>
              </Toggle>
            );
          })}
        </ToggleRow>
        <DirectionalFrame data-dir={dir}>
          <InlineStartBox>
            <InlineStartLabel>margin-inline-start: lg</InlineStartLabel>
          </InlineStartBox>
        </DirectionalFrame>
        <InlineMarkdown variant="brief">
          {`The dark box sits on the left under \`ltr\`, jumps to the right edge under \`rtl\`. Yoga maps the logical edge from the cascade direction.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>display: contents · §2.5</Tag>
        <ContentsFrame>
          <ContentsWrapper>
            <ContentsChild>
              <ContentsChildLabel>child A</ContentsChildLabel>
            </ContentsChild>
            <ContentsChild>
              <ContentsChildLabel>child B</ContentsChildLabel>
            </ContentsChild>
          </ContentsWrapper>
        </ContentsFrame>
        <InlineMarkdown variant="brief">
          {`The wrapper carries loud red padding + border, but \`display: contents\` strips its principal box; children pack flush with no red around them. Red flashing through would mean the wrapper kept its box.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>position: static · §2</Tag>
        <Anchor>
          <StaticInner>
            <StaticLabel>static parent (no containing block)</StaticLabel>
          </StaticInner>
          <PinnedDot />
        </Anchor>
        <InlineMarkdown variant="brief">
          {`The pinned dot lives inside the static box but anchors to the outer relative frame's top-right edge. \`position: static\` doesn't establish a containing block.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>text-align: start | end · §6.1</Tag>
        <AlignFrame>
          <AlignStart>start</AlignStart>
          <AlignEnd>end</AlignEnd>
          <AlignLeft>left (reference)</AlignLeft>
          <AlignRight>right (reference)</AlignRight>
        </AlignFrame>
        <InlineMarkdown variant="brief">
          {`On native, \`start\` should match the device-locale default (\`left\` in LTR locales); \`end\` warns and falls back to \`auto\`. On rn-web both spec values pass through and match \`left\` / \`right\` under a LTR document.`}
        </InlineMarkdown>
      </Row>
    </Stack>
  );
}
