import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown, Markdown } from '../components/Markdown';

/**
 * CSS Values 4 §6.1 - `em` / `lh` / `rlh`. Each unit resolves at
 * render time against the cascade: `em` against the current
 * `font-size`, `lh` against the current `line-height`, `rlh` against
 * the root `line-height`. Components that declare `font-size` /
 * `line-height` publish those values to descendants through the
 * native cascade, so one declaration at the top of a card drives
 * every relative measurement inside it.
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

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const Card = styled.View<{ $size: number }>`
  font-size: ${p => p.$size}px;
  line-height: ${p => p.$size * 1.4}px;
  padding: 1em;
  gap: 0.5em;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surface};
`;

// The headline reads cascade font-size directly via 1em; its rule
// shifts margin-block-end in lh so the gap below scales with the
// rendered line-height, not the parent gap.
const Headline = styled.Text`
  font-size: 1em;
  line-height: 1lh;
  letter-spacing: 0.03em;
  margin-block-end: 0.5lh;
  color: ${t.colors.ink};
`;

const Body = styled.Text`
  font-size: 0.75em;
  line-height: 1lh;
  color: ${t.colors.fg};
`;

const Caption = styled.Text`
  font-size: 0.625em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${t.colors.fgMuted};
`;

const Bar = styled.View<{ $em: number }>`
  height: 4px;
  width: ${p => p.$em}em;
  background-color: ${t.colors.ink};
`;

// `text-align: start` resolves against the cascade direction; the
// same component flips end-edge under `direction: rtl`. The em
// padding adapts to the cascade font-size on its way down.
const DirectionalCard = styled.View<{ $size: number; $dir: 'ltr' | 'rtl' }>`
  font-size: ${p => p.$size}px;
  direction: ${p => p.$dir};
  padding: 1em;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surface};
`;

// Stretched + colored so the alignment of the glyphs within the row
// is unmistakable. The arrow + word gives the reader an obvious axis.
const DirectionalLabel = styled.Text`
  font-size: 1em;
  text-align: start;
  color: ${t.colors.bg};
  background-color: ${t.colors.ink};
  padding: ${t.space.xs}px ${t.space.sm}px;
  align-self: stretch;
`;

export function EmLhCascadeBoard() {
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Each card sets one \`font-size\` at the top. Everything inside - padding, gap, letter-spacing, margin-block-end, bar widths - scales relative to that single number.`}
      </InlineMarkdown>
      <Section>
        <SectionTitle>font-size cascades em / lh down the subtree</SectionTitle>
        <Tag>font-size: 14px · padding: 1em · gap: 0.5em</Tag>
        <Card $size={14}>
          <Headline>Hello world</Headline>
          <Body>Body text reads `font-size: 0.75em` so it tracks the parent down.</Body>
          <Caption>Caption · 0.625em</Caption>
          <Bar $em={6} />
          <Bar $em={3} />
        </Card>
        <Tag>font-size: 20px · same declarations</Tag>
        <Card $size={20}>
          <Headline>Hello world</Headline>
          <Body>Body text reads `font-size: 0.75em` so it tracks the parent up.</Body>
          <Caption>Caption · 0.625em</Caption>
          <Bar $em={6} />
          <Bar $em={3} />
        </Card>
      </Section>
      <Section>
        <SectionTitle>direction-aware text-align: start</SectionTitle>
        <Markdown variant="hint">
          {`Every card below uses the same \`text-align: start\` declaration. The visual edge of the text depends on the inherited paragraph \`direction\` and the script of the content. Latin glyphs read left-to-right; Arabic reads right-to-left.`}
        </Markdown>
        <Tag>direction: ltr · Latin script</Tag>
        <DirectionalCard $size={16} $dir="ltr">
          <DirectionalLabel>▸ start edge</DirectionalLabel>
        </DirectionalCard>
        <Tag>direction: rtl · Latin script</Tag>
        <DirectionalCard $size={16} $dir="rtl">
          <DirectionalLabel>▸ start edge</DirectionalLabel>
        </DirectionalCard>
        <Tag>direction: ltr · Arabic script</Tag>
        <DirectionalCard $size={16} $dir="ltr">
          <DirectionalLabel>الحافة البادئة ▸</DirectionalLabel>
        </DirectionalCard>
        <Tag>direction: rtl · Arabic script</Tag>
        <DirectionalCard $size={16} $dir="rtl">
          <DirectionalLabel>الحافة البادئة ▸</DirectionalLabel>
        </DirectionalCard>
      </Section>
      <Markdown variant="hint">
        {`A child reading \`1em\` resolves to the nearest ancestor's \`font-size\` at render time. rn-web hands the same declarations to the browser, which does the same.`}
      </Markdown>
    </Stack>
  );
}
