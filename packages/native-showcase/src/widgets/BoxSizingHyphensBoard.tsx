import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown, Markdown } from '../components/Markdown';

/**
 * CSS Box 3 §3.3 - `box-sizing: border-box | content-box`. The
 * polyfill flows the keyword unchanged on every platform, swapping
 * how `width` accounts for padding + border. Pair with `hyphens:
 * auto | manual | none` (CSS Text 3 §6.1) for the typography half;
 * on Android the value drives the system hyphenation frequency, on
 * iOS automatic hyphenation falls back to manual breaking via U+00AD
 * soft hyphens, rn-web hands both keywords to the browser.
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

const Group = styled.View`
  gap: ${t.space.xs}px;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

// Same width + padding + border. Border-box keeps the box at 200px
// and squeezes the inner content; content-box adds padding + border
// onto the declared 200px, so the box ends up wider.
const BorderBoxCard = styled.View`
  box-sizing: border-box;
  width: 200px;
  padding: ${t.space.md}px;
  border: 4px solid ${t.colors.ink};
  background-color: ${t.colors.surfaceMuted};
`;

const ContentBoxCard = styled.View`
  box-sizing: content-box;
  width: 200px;
  padding: ${t.space.md}px;
  border: 4px solid ${t.colors.ink};
  background-color: ${t.colors.surfaceMuted};
`;

const Inner = styled.View`
  height: 24px;
  background-color: ${t.colors.fail};
`;

const NarrowColumn = styled.View`
  width: 240px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surface};
  padding: ${t.space.sm}px;
`;

const Paragraph = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
`;

const Hyphenated = styled(Paragraph)`
  hyphens: auto;
`;

const NoHyphens = styled(Paragraph)`
  hyphens: none;
`;

const ManualHyphens = styled(Paragraph)`
  hyphens: manual;
`;

const LONG_WORDS =
  'Antidisestablishmentarianism and pneumonoultramicroscopicsilicovolcanoconiosis demonstrate hyphenation behavior in a narrow column.';
// Soft hyphens (U+00AD) inside long words. `hyphens: manual` honors
// them only at U+00AD break points; `hyphens: none` ignores them.
const SOFT_HYPHENATED =
  'Anti­dis­es­tab­lish­men­tar­i­an­ism breaks only at the soft hyphens you authored.';

export function BoxSizingHyphensBoard() {
  return (
    <Stack>
      <Section>
        <SectionTitle>box-sizing</SectionTitle>
        <Group>
          <Tag>box-sizing: border-box · width: 200px · padding: md · border: 4px</Tag>
          <BorderBoxCard>
            <Inner />
          </BorderBoxCard>
        </Group>
        <Group>
          <Tag>box-sizing: content-box · same declarations</Tag>
          <ContentBoxCard>
            <Inner />
          </ContentBoxCard>
        </Group>
        <InlineMarkdown variant="brief">
          {`Both cards declare \`width: 200px\` with identical padding + border. Under \`border-box\` the card stays 200px wide and squeezes the inner red bar; under \`content-box\` padding + border land outside the declared 200px, so the card grows wider.`}
        </InlineMarkdown>
      </Section>
      <Section>
        <SectionTitle>hyphens</SectionTitle>
        <Group>
          <Tag>hyphens: auto · system breaks long words</Tag>
          <NarrowColumn>
            <Hyphenated>{LONG_WORDS}</Hyphenated>
          </NarrowColumn>
        </Group>
        <Group>
          <Tag>hyphens: none · no breaks even with soft hyphens</Tag>
          <NarrowColumn>
            <NoHyphens>{SOFT_HYPHENATED}</NoHyphens>
          </NarrowColumn>
        </Group>
        <Group>
          <Tag>hyphens: manual · breaks only at U+00AD soft-hyphens</Tag>
          <NarrowColumn>
            <ManualHyphens>{SOFT_HYPHENATED}</ManualHyphens>
          </NarrowColumn>
        </Group>
      </Section>
      <Markdown variant="hint">
        {`Android breaks long words automatically using the system hyphenator. iOS has no equivalent API in this release, so \`hyphens: auto\` behaves like \`manual\`: words break only where you embedded a soft hyphen (U+00AD) in the text. rn-web hands the keyword to the browser.`}
      </Markdown>
    </Stack>
  );
}
