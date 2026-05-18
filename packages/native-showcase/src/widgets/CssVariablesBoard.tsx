import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * CSS Custom Properties on React Native: `--name` declarations publish
 * through the component cascade, `var()` substitutes at render time.
 * Every row picks colors / spacings the polyfill resolves so the
 * rendered output IS the proof. A broken pipeline would surface as
 * black-or-undefined fills, plain stacks, or default padding.
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

/* Row 1 — self-declared. The same component sets `--brand` and reads
   it back through `var()`; the text renders in the literal color the
   custom property holds. */
const SelfDeclared = styled.Text`
  --brand: tomato;
  color: var(--brand);
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
`;

/* Row 2 — cascade from ancestor. Outer styled component declares
   `--brand`; an arbitrary descendant reads it. The inner has no
   knowledge of which value the ancestor publishes. */
const ThemeProvider = styled.View`
  --brand: royalblue;
  --accent: papayawhip;
  gap: ${t.space.xs}px;
`;
const CascadeReader = styled.Text`
  color: var(--brand);
  background-color: var(--accent);
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
`;

/* Row 3 — nearer-ancestor override. Outer publishes one color, an
   intermediate styled component overrides with another; the leaf
   reads the closer value, not the outer's. */
const Outer = styled.View`
  --brand: crimson;
  gap: ${t.space.xs}px;
`;
const InnerOverride = styled.View`
  --brand: mediumseagreen;
  gap: ${t.space.xs}px;
`;
const Swatch = styled.View`
  background-color: var(--brand);
  height: 24px;
`;

/* Row 4 — fallback chain. Two missing properties pinned to a real
   fallback so the test isn't "did var() resolve" but "did fallback
   resolve in the right order". */
const Fallback = styled.Text`
  color: var(--missing, var(--alsoMissing, slateblue));
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
`;

/* Row 5 — shorthand expansion through var(). The substituted text
   feeds back through transformDecl so the `padding` shorthand splits
   into longhands. The visible asymmetry (more horizontal than vertical
   padding) is the proof. */
const ShorthandHost = styled.View`
  --gap: 6px 24px;
  align-self: flex-start;
  padding: var(--gap);
  background-color: tomato;
`;
const ShorthandLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  color: white;
`;

/* Row 6 — light-dark inside the cascade value. The custom property
   evaluates at render time, so swapping OS theme repaints without
   re-mounting the component. */
const ThemedProvider = styled.View`
  --themed: light-dark(darkslateblue, gold);
  gap: ${t.space.xs}px;
`;
const ThemedText = styled.Text`
  color: var(--themed);
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.body}px;
`;

export function CssVariablesBoard() {
  return (
    <Stack>
      <Row>
        <Tag>self-declared var()</Tag>
        <Frame>
          <SelfDeclared>color: var(--brand);</SelfDeclared>
        </Frame>
        <InlineMarkdown variant="brief">
          {`The component declares \`--brand: tomato\` then reads \`color: var(--brand)\`. The text renders tomato; a broken substitution would leak as the default text color.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>cascade from ancestor</Tag>
        <ThemeProvider>
          <Frame>
            <CascadeReader>color + background from --brand / --accent</CascadeReader>
          </Frame>
        </ThemeProvider>
        <InlineMarkdown variant="brief">
          {`The outer styled component publishes \`--brand\` and \`--accent\`; the inner reads both via \`var()\`. The substitution sees the cascade exposed by every ancestor on the path.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>nearer wins</Tag>
        <Outer>
          <Frame>
            <Swatch />
            <InnerOverride>
              <Swatch />
            </InnerOverride>
          </Frame>
        </Outer>
        <InlineMarkdown variant="brief">
          {`The outer publishes \`--brand: crimson\`, an intermediate override publishes \`--brand: mediumseagreen\`. The leaf swatches read whichever ancestor is nearest: one crimson bar, one mediumseagreen bar.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>fallback chain</Tag>
        <Frame>
          <Fallback>var(--missing, var(--alsoMissing, slateblue))</Fallback>
        </Frame>
        <InlineMarkdown variant="brief">
          {`Both referenced properties are absent, so the substitution falls all the way through to the literal \`slateblue\`. Nested \`var()\` in the fallback is honored.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>shorthand expansion</Tag>
        <Frame>
          <ShorthandHost>
            <ShorthandLabel>padding: var(--gap)</ShorthandLabel>
          </ShorthandHost>
        </Frame>
        <InlineMarkdown variant="brief">
          {`\`--gap: 6px 24px\` substitutes into \`padding: var(--gap)\`; the substituted text re-enters the value pipeline so the two-value shorthand expands to top/bottom + left/right longhands. The label hugs the top and bottom with breathing room on the sides.`}
        </InlineMarkdown>
      </Row>

      <Row>
        <Tag>light-dark inside var()</Tag>
        <ThemedProvider>
          <Frame>
            <ThemedText>var(--themed) repaints with OS theme</ThemedText>
          </Frame>
        </ThemedProvider>
        <InlineMarkdown variant="brief">
          {`\`--themed: light-dark(darkslateblue, gold)\`; the text resolves to the active OS scheme through the cascade. Switch the device theme to flip without a re-mount.`}
        </InlineMarkdown>
      </Row>
    </Stack>
  );
}
