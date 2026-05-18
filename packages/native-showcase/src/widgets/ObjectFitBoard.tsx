import { Asset } from 'expo-asset';
import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * CSS Images 3 §5.5 - `object-fit: fill | contain | cover | none |
 * scale-down`. The polyfill flows the keyword through to RN's
 * `<Image>` (`resizeMode` already implements the same five values),
 * so the cross-platform contract is identical to the browser's.
 * Two aspect-ratio crops per value make the difference between
 * `cover` and `contain` obvious without measuring.
 */

const dogUri = Asset.fromModule(require('../../assets/dog.png')).uri;

const FITS = ['fill', 'contain', 'cover', 'none', 'scale-down'] as const;
type Fit = (typeof FITS)[number];

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

const Pair = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
`;

const Wide = styled.View`
  width: 160px;
  height: 80px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surfaceMuted};
  overflow: hidden;
`;

const Tall = styled.View`
  width: 80px;
  height: 160px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.surfaceMuted};
  overflow: hidden;
`;

// Five styled.Image variants - one per fit value. Each is a single
// CSS declaration; the demo swaps which component renders, not the
// declaration text. Width / height pulled in from the wrapper so the
// fit value is the only behavioural variable.
const FitFill = styled.Image`
  width: 100%;
  height: 100%;
  object-fit: fill;
`;
const FitContain = styled.Image`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;
const FitCover = styled.Image`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
const FitNone = styled.Image`
  width: 100%;
  height: 100%;
  object-fit: none;
`;
const FitScaleDown = styled.Image`
  width: 100%;
  height: 100%;
  object-fit: scale-down;
`;

function FittedImage({ fit }: { fit: Fit }) {
  const src = { uri: dogUri };
  switch (fit) {
    case 'fill':
      return <FitFill source={src} />;
    case 'contain':
      return <FitContain source={src} />;
    case 'cover':
      return <FitCover source={src} />;
    case 'none':
      return <FitNone source={src} />;
    case 'scale-down':
      return <FitScaleDown source={src} />;
  }
}

export function ObjectFitBoard() {
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Every cell is the same image cropped to two different aspect ratios. The CSS \`object-fit\` keyword decides how the image fills its box.`}
      </InlineMarkdown>
      {FITS.map(fit => (
        <Section key={fit}>
          <SectionTitle>object-fit: {fit}</SectionTitle>
          <Row>
            <Tag>wide box (2:1) · tall box (1:2)</Tag>
            <Pair>
              <Wide>
                <FittedImage fit={fit} />
              </Wide>
              <Tall>
                <FittedImage fit={fit} />
              </Tall>
            </Pair>
          </Row>
        </Section>
      ))}
    </Stack>
  );
}
