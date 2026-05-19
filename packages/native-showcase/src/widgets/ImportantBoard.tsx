import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * `!important` on React Native. Within-component cascade: an
 * important declaration beats normal ones from any matched bucket
 * (base, `@media`, attribute, pseudo, etc.) regardless of source
 * order. The runtime `style={{}}` prop is overridden too, matching
 * the web's behavior on the same source CSS.
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

const Frame = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surface};
  gap: ${t.space.xs}px;
`;

const Pair = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
`;

/* Row 1 — side-by-side normal vs important. Both components author
   two color decls in the same source order; only the important
   marker flips which one wins. */
const NormalCascade = styled.Text`
  color: tomato;
  color: royalblue;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
`;
const ImportantBeatsLater = styled.Text`
  color: tomato !important;
  color: royalblue;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
`;

/* Row 2 — shorthand !important propagates to every longhand. The
   first shorthand sets symmetric padding; the second uses an asymmetric
   two-value with !important. The label sits flush against top/bottom
   and breathes left/right. */
const ShorthandImportant = styled.View`
  align-self: flex-start;
  padding: 24px 24px;
  padding: 2px 28px !important;
  background-color: tomato;
`;
const ShorthandLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  color: white;
`;

/* Row 3 — conditional bucket. A media query body sets `color: blue`;
   the base has `color: red !important`. The matched bucket's normal
   value loses to the base important. Toggling the data-on attribute
   (always true here; the @media always matches) keeps the box red. */
const MatchedImportantHolds = styled.Text`
  color: tomato !important;
  @media (min-width: 0px) {
    color: royalblue;
  }
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
`;

/* Row 4 — conditional !important beats base !important. Same setup,
   but the matched bucket also carries !important. Among importants,
   source-later wins — the matched bucket's blue overrides. */
const MatchedImportantWins = styled.Text`
  color: tomato !important;
  @media (min-width: 0px) {
    color: royalblue !important;
  }
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
`;

/* Row 5 — !important overrides the runtime `style` prop. Web-aligned
   behavior; a styled important is an author declaration that beats
   the inline style attribute. The right box uses the same component
   but passes `style={{ backgroundColor: 'goldenrod' }}` — the
   styled !important wins; the user style is ignored. */
const SwatchBase = styled.View`
  background-color: tomato !important;
  width: 80px;
  height: 48px;
`;

/* Row 6 — pseudo bucket. Press the box; the pressed state declares
   `color: royalblue` (normal). The base `color: tomato !important`
   still wins so the label stays tomato under press. The :active
   bucket also flips background-color (no !important on either side)
   so iOS users can see the bucket fired even though the color demo's
   intended outcome is "no change". */
const PressedNormal = styled.Pressable`
  color: tomato !important;
  padding: ${t.space.xs}px ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
  &:active {
    background-color: ${t.colors.signalSoft};
    color: royalblue;
  }
`;
const PressedLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  color: inherit;
`;

export function ImportantBoard() {
  const [, setNow] = useState(0);
  return (
    <Stack>
      <Row>
        <Tag>normal vs important</Tag>
        <Frame>
          <Pair>
            <NormalCascade>normal cascade</NormalCascade>
            <ImportantBeatsLater>!important wins</ImportantBeatsLater>
          </Pair>
        </Frame>
        <InlineMarkdown variant="brief">
          {`Both components author \`color: tomato; color: royalblue\` in that order. The left lets the cascade pick the later value (royalblue); the right marks the first as \`!important\` and the text stays tomato.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>shorthand propagates</Tag>
        <Frame>
          <ShorthandImportant>
            <ShorthandLabel>padding: 2px 28px !important</ShorthandLabel>
          </ShorthandImportant>
        </Frame>
        <InlineMarkdown variant="brief">
          {`Authored as \`padding: 24px 24px; padding: 2px 28px !important;\`. The important shorthand expands to all four longhands so the label hugs top + bottom (2px) and breathes left + right (28px). The 24px symmetric padding is gone.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>base !important beats matched bucket</Tag>
        <Frame>
          <MatchedImportantHolds>base wins via !important</MatchedImportantHolds>
        </Frame>
        <InlineMarkdown variant="brief">
          {`The base declares \`color: tomato !important\`; an always-matching \`@media\` overrides with normal \`color: royalblue\`. The matched bucket is "later" in source order, but importance beats normal — the text stays tomato.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>matched !important beats base !important</Tag>
        <Frame>
          <MatchedImportantWins>matched wins via !important</MatchedImportantWins>
        </Frame>
        <InlineMarkdown variant="brief">
          {`Both layers are important now. Among importants, source-later wins, so the matched \`@media\` bucket's royalblue overrides the base tomato.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>!important beats user style prop</Tag>
        <Frame>
          <Pair>
            <SwatchBase />
            <SwatchBase style={{ backgroundColor: 'goldenrod' }} />
          </Pair>
        </Frame>
        <InlineMarkdown variant="brief">
          {`Same styled component on both sides. The right one passes \`style={{ backgroundColor: 'goldenrod' }}\` as a prop; the styled \`!important\` still wins, so both swatches stay tomato. Spec-aligned with the web: an author \`!important\` beats inline normal.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>pseudo bucket</Tag>
        <Frame>
          <PressedNormal onPress={() => setNow(n => n + 1)}>
            <PressedLabel>press me</PressedLabel>
          </PressedNormal>
        </Frame>
        <InlineMarkdown variant="brief">
          {`Press the box. The \`:active\` bucket declares \`color: royalblue\` as a normal value; the base \`color: tomato !important\` overrides. The label stays tomato even while pressed.`}
        </InlineMarkdown>
      </Row>
    </Stack>
  );
}
