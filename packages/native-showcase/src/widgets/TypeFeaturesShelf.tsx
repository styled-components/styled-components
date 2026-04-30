import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.sm}px;
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
  text-decoration: underline ${t.colors.fail};
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
    </Stack>
  );
}
