import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown, Markdown } from '../components/Markdown';

/**
 * CSS UI 4 §6.2 - `text-overflow: ellipsis | clip`. The polyfill maps
 * ellipsis to `<Text numberOfLines>` + `ellipsizeMode="tail"`; clip
 * maps to the matching `clip` mode. Pair with `text-wrap: nowrap`
 * (or `line-clamp`) so an overflow is actually possible. The ellipsis
 * lands at the inline-end of the script: visually the right edge for
 * LTR content (Latin) and the left edge for RTL content (Arabic).
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Group = styled.View`
  gap: ${t.space.sm}px;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const Frame = styled.View`
  width: 220px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surface};
  padding: ${t.space.xs}px ${t.space.sm}px;
`;

const Body = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  color: ${t.colors.ink};
`;

const SingleLineEllipsis = styled(Body)`
  text-wrap: nowrap;
  text-overflow: ellipsis;
`;

const SingleLineClip = styled(Body)`
  text-wrap: nowrap;
  text-overflow: clip;
`;

const ClampEllipsis = styled(Body)`
  line-clamp: 2;
  text-overflow: ellipsis;
`;

const ClampClip = styled(Body)`
  line-clamp: 2;
  text-overflow: clip;
`;

const SINGLE =
  'A single sentence that absolutely does not fit on one line inside this narrow card.';
const MULTI =
  'Multi-line truncation - this paragraph runs long on purpose so the second line ends mid-word and the overflow mode decides whether the trailing edge resolves to an ellipsis or a hard clip.';
const ARABIC_SINGLE =
  'جملة واحدة طويلة جدا لا يمكن أن تتسع في سطر واحد داخل هذه البطاقة الضيقة بأي شكل من الأشكال.';
const ARABIC_MULTI =
  'الاقتطاع متعدد الأسطر، تركض هذه الفقرة طويلا عن قصد حتى ينتهي السطر الثاني في منتصف الكلمة، ويقرر وضع التجاوز ما إذا كانت الحافة الزائدة ستظهر كثلاث نقاط أم كقص مفاجئ.';

export function TextOverflowBoard() {
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Each card is the same width; the only CSS difference is the \`text-overflow\` value. \`ellipsis\` ends with a Unicode \`…\`; \`clip\` ends abruptly at the box edge.`}
      </InlineMarkdown>
      <Group>
        <Tag>text-wrap: nowrap · ellipsis</Tag>
        <Frame>
          <SingleLineEllipsis>{SINGLE}</SingleLineEllipsis>
        </Frame>
      </Group>
      <Group>
        <Tag>text-wrap: nowrap · clip</Tag>
        <Frame>
          <SingleLineClip>{SINGLE}</SingleLineClip>
        </Frame>
      </Group>
      <Group>
        <Tag>line-clamp: 2 · ellipsis</Tag>
        <Frame>
          <ClampEllipsis>{MULTI}</ClampEllipsis>
        </Frame>
      </Group>
      <Group>
        <Tag>line-clamp: 2 · clip</Tag>
        <Frame>
          <ClampClip>{MULTI}</ClampClip>
        </Frame>
      </Group>
      <Group>
        <Tag>Arabic script · single line · ellipsis lands on the visual left</Tag>
        <Frame>
          <SingleLineEllipsis>{ARABIC_SINGLE}</SingleLineEllipsis>
        </Frame>
      </Group>
      <Group>
        <Tag>Arabic script · line-clamp: 2 · ellipsis lands on the visual left</Tag>
        <Frame>
          <ClampEllipsis>{ARABIC_MULTI}</ClampEllipsis>
        </Frame>
      </Group>
      <Markdown variant="hint">
        {`The ellipsis follows the script direction, not the paragraph direction. Latin content overflows on the right, Arabic content overflows on the left. Without \`text-wrap: nowrap\` or \`line-clamp\` the text wraps and there is nothing to overflow. Web builds pass the declaration to the browser.`}
      </Markdown>
    </Stack>
  );
}
