import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  border-bottom-width: ${t.borderWidth.hairline}px;
  border-bottom-color: ${t.colors.border};
  padding-bottom: ${t.space.xs}px;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const TabularRow = styled(Row)`
  flex-direction: row;
  gap: ${t.space.md}px;
`;

const Numbers = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
  font-variant: tabular-nums;
`;

const ProportionalNumbers = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
  font-variant: proportional-nums;
`;

const Clamped = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.fg};
  line-clamp: 2;
`;

const Tracked = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.title}px;
  letter-spacing: 4px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

const Decorated = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
  /* Vivid magenta for high-contrast against the body color, makes the
     "decoration color is independent of text color" demo obvious at a
     glance, especially on Android where the polyfill needs the patched
     react-native to honor the value. */
  text-decoration: underline #ff00aa;
`;

const Struck = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
  text-decoration: line-through #ff00aa;
`;

const DecoratedDouble = styled(Decorated)`
  text-decoration: underline double #ff00aa;
`;

const DecoratedDotted = styled(Decorated)`
  text-decoration: underline dotted #ff00aa;
`;

const DecoratedDashed = styled(Decorated)`
  text-decoration: underline dashed #ff00aa;
`;

const DecoratedWavy = styled(Decorated)`
  text-decoration: underline wavy #ff00aa;
`;

const LONG = `Line clamp truncates to N visible lines and adds an ellipsis on overflow. The text-input here is intentionally long so the clamp can do its job and prove that the polyfill maps to numberOfLines.`;

export function TypeFeaturesShelf() {
  return (
    <Stack>
      <TabularRow>
        <Tag>tabular-nums</Tag>
        <Numbers>1,234.56  ·  7,890.12</Numbers>
      </TabularRow>
      <TabularRow>
        <Tag>proportional-nums</Tag>
        <ProportionalNumbers>1,234.56  ·  7,890.12</ProportionalNumbers>
      </TabularRow>
      <Row>
        <Tag>line-clamp · 2</Tag>
      </Row>
      <Clamped>{LONG}</Clamped>
      <Row>
        <Tag>letter-spacing</Tag>
      </Row>
      <Tracked>Tracked heading</Tracked>
      <Row>
        <Tag>text-decoration</Tag>
      </Row>
      <Decorated>Underline keyed to a theme color.</Decorated>
      <Decorated>
        Multi-line underline check: this sentence is long on purpose so the
        layout wraps it across two or three visual lines, letting us
        verify that each wrapped segment receives its own colored
        underline that starts and ends at the line's content boundaries.
      </Decorated>
      <Struck>Strikethrough keyed to a theme color.</Struck>
      <Struck>
        Multi-line strikethrough check: another deliberately long sentence
        so we can confirm each wrapped line gets its own colored strike
        positioned around the x-height midline.
      </Struck>
      <DecoratedDouble>Double-stroke underline.</DecoratedDouble>
      <DecoratedDotted>Dotted underline.</DecoratedDotted>
      <DecoratedDashed>Dashed underline.</DecoratedDashed>
      <DecoratedWavy>Wavy underline.</DecoratedWavy>
    </Stack>
  );
}
