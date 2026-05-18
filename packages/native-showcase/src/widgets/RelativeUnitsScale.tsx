import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown } from '../components/Markdown';

/**
 * CSS Values 4 §6.1.1 (rem). `1rem` equals the root font-size - on RN
 * we resolve against `ResolveEnv.rootFontSize` (default 16). The demo
 * is a rem-driven type ramp: each dark bar's width is declared in rem,
 * each muted bar is the equivalent px reference at `rootFontSize: 16`.
 * When the bars line up, the rem resolver fired correctly.
 */

// Length-comparison demos stack vertically on every screen size. The
// rem bar and its px reference share a common left edge so the eye can
// confirm the lengths match; tiling them side-by-side breaks the visual
// alignment that proves the polyfill fired.
const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.sm}px;
  align-items: center;
`;

const Tag = styled.Text`
  width: 80px;
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

const Bar = styled.View`
  height: 28px;
  background-color: ${t.colors.ink};
`;

const Bar1rem = styled(Bar)`
  width: 1rem;
`;

const Bar2rem = styled(Bar)`
  width: 2rem;
`;

const Bar3rem = styled(Bar)`
  width: 3rem;
`;

const Bar4rem = styled(Bar)`
  width: 4rem;
`;

const Bar1remCalc = styled(Bar)`
  width: calc(2rem + 4px);
`;

const Bar1remHalf = styled(Bar)`
  width: 0.5rem;
`;

const Reference = styled(Bar)`
  background-color: ${t.colors.fgMuted};
`;

export function RelativeUnitsScale() {
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Each dark bar's width is declared in rem; each muted bar is the equivalent px reference at \`rootFontSize: 16\`. When the bars line up, the rem resolver fired correctly.`}
      </InlineMarkdown>

      <Row>
        <Tag>0.5rem</Tag>
        <Bar1remHalf />
      </Row>
      <Row>
        <Tag>8px</Tag>
        <Reference style={{ width: 8 }} />
      </Row>

      <Row>
        <Tag>1rem</Tag>
        <Bar1rem />
      </Row>
      <Row>
        <Tag>16px</Tag>
        <Reference style={{ width: 16 }} />
      </Row>

      <Row>
        <Tag>2rem</Tag>
        <Bar2rem />
      </Row>
      <Row>
        <Tag>32px</Tag>
        <Reference style={{ width: 32 }} />
      </Row>

      <Row>
        <Tag>3rem</Tag>
        <Bar3rem />
      </Row>
      <Row>
        <Tag>48px</Tag>
        <Reference style={{ width: 48 }} />
      </Row>

      <Row>
        <Tag>4rem</Tag>
        <Bar4rem />
      </Row>
      <Row>
        <Tag>64px</Tag>
        <Reference style={{ width: 64 }} />
      </Row>

      <Row>
        <Tag>2rem + 4px</Tag>
        <Bar1remCalc />
      </Row>
      <Row>
        <Tag>36px</Tag>
        <Reference style={{ width: 36 }} />
      </Row>
    </Stack>
  );
}
