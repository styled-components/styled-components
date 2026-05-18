import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown, Markdown } from '../components/Markdown';

/**
 * CSS UI 4 §5.2.1 - `caret-color: auto | <color>`. On native the
 * polyfill lifts the resolved color onto `<TextInput>.cursorColor`
 * (Android) without touching selection highlight; iOS keeps its
 * default caret (RN's iOS selection API tints caret + selection
 * range together, which would violate the spec contract). rn-web
 * forwards the declaration so the browser handles it.
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

const Row = styled.View`
  gap: ${t.space.xs}px;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const BaseInput = styled.TextInput`
  padding: ${t.space.xs}px ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surface};
  color: ${t.colors.ink};
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
`;

const AutoCaret = styled(BaseInput)`
  caret-color: auto;
`;

const MagentaCaret = styled(BaseInput)`
  caret-color: #ec4899;
`;

const OklchCaret = styled(BaseInput)`
  caret-color: oklch(0.7 0.18 145);
`;

const ThemedCaret = styled(BaseInput)`
  caret-color: light-dark(#1f7a52, #5dd4a3);
`;

export function CaretColorBoard() {
  const [v, setV] = useState('Focus a field to see its caret');
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Tap any field to focus it - the blinking caret tints to the declared color. Type to extend the text; the selection range stays the platform default.`}
      </InlineMarkdown>
      <Section>
        <SectionTitle>caret-color values</SectionTitle>
        <Row>
          <Tag>caret-color: auto</Tag>
          <AutoCaret
            value={v}
            onChangeText={setV}
            placeholderTextColor={t.colors.fgFaint}
            accessibilityLabel="auto caret"
          />
        </Row>
        <Row>
          <Tag>caret-color: #ec4899</Tag>
          <MagentaCaret
            value={v}
            onChangeText={setV}
            placeholderTextColor={t.colors.fgFaint}
            accessibilityLabel="magenta caret"
          />
        </Row>
        <Row>
          <Tag>caret-color: oklch(0.7 0.18 145)</Tag>
          <OklchCaret
            value={v}
            onChangeText={setV}
            placeholderTextColor={t.colors.fgFaint}
            accessibilityLabel="oklch caret"
          />
        </Row>
        <Row>
          <Tag>caret-color: light-dark(green, mint)</Tag>
          <ThemedCaret
            value={v}
            onChangeText={setV}
            placeholderTextColor={t.colors.fgFaint}
            accessibilityLabel="theme caret"
          />
        </Row>
      </Section>
      <Markdown variant="hint">
        {`iOS keeps its default caret in this release - the iOS text-input API tints the caret and selection range together, so a per-property caret color would also recolor selections. Pass \`selectionColor\` directly on the input for an iOS-specific tint.`}
      </Markdown>
    </Stack>
  );
}
