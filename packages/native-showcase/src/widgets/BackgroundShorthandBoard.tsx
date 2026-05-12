import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * CSS Backgrounds 3 §2.10 — `background` shorthand. Each row uses a
 * single `background:` declaration; the polyfill expands to the eight
 * longhands (image / position / size / repeat / origin / clip /
 * attachment / color). The demo's proof is the rendered paint matching
 * what the longhand form would produce.
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

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

const Tile = styled.View`
  width: 100%;
  aspect-ratio: 2;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

const SolidColor = styled(Tile)`
  background: #1f7a52;
`;

const ImageOnly = styled(Tile)`
  background: linear-gradient(135deg, #ff8a00, #6b1bb1);
`;

const ImageAndColor = styled(Tile)`
  background: linear-gradient(135deg, rgba(255, 138, 0, 0.5), rgba(107, 27, 177, 0.5)) #1f7a52;
`;

const PositionAndSize = styled(Tile)`
  background: linear-gradient(0deg, #ff8a00, #ffffff) center / contain no-repeat;
`;

const MultiLayer = styled(Tile)`
  background:
    linear-gradient(135deg, rgba(255, 138, 0, 0.6), transparent),
    linear-gradient(45deg, rgba(31, 122, 82, 0.6), transparent);
`;

/* Small radial-dot pattern tiled across the tile. With a `repeat`
   attachment + small background-size, the gradient tiles like a dot
   grid; with `no-repeat` you'd see one centered dot. */
const Tiled = styled(Tile)`
  background:
    radial-gradient(circle at center, #1f7a52 30%, transparent 32%) 0 0 / 24px 24px repeat;
`;

// `background-attachment: fixed` has no demo row. The keyword can't be
// observed in the showcase context (rn-web's nested ScrollView prevents
// document-viewport scroll; native drops the keyword with a warn). The
// shorthand's parse + warn path is locked by tests in shorthands.test.ts.

export function BackgroundShorthandBoard() {
  return (
    <Stack>
      <Row>
        <SolidColor />
        <Tag>color only</Tag>
        <Caption>{`background: #1f7a52`}</Caption>
      </Row>
      <Row>
        <ImageOnly />
        <Tag>image only</Tag>
        <Caption>{`background: linear-gradient(135deg, #ff8a00, #6b1bb1)`}</Caption>
      </Row>
      <Row>
        <ImageAndColor />
        <Tag>image + final color</Tag>
        <Caption>
          {`background: linear-gradient(135deg, rgba(...,0.5), rgba(...,0.5)) #1f7a52`}
        </Caption>
        <InlineMarkdown variant="brief">
          {`Translucent gradient over a solid color — color shows through transparent stops.`}
        </InlineMarkdown>
      </Row>
      <Row>
        <PositionAndSize />
        <Tag>position / size / repeat</Tag>
        <Caption>{`background: linear-gradient(...) center / contain no-repeat`}</Caption>
      </Row>
      <Row>
        <MultiLayer />
        <Tag>multi-layer</Tag>
        <Caption>{`background: linear-gradient(...), linear-gradient(...)`}</Caption>
      </Row>
      <Row>
        <Tiled />
        <Tag>tiled repeat</Tag>
        <Caption>{`background: radial-gradient(...) 0 0 / 24px 24px repeat`}</Caption>
        <InlineMarkdown variant="brief">
          {`Small radial dot tiled across the tile via \`background-repeat: repeat\` paired with an explicit \`background-size\` smaller than the box.`}
        </InlineMarkdown>
      </Row>
    </Stack>
  );
}
