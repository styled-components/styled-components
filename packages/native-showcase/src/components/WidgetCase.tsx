import React from 'react';
import styled from 'styled-components/native';
import { FeatureChip } from '@/components/FeatureChip';
import { InlineMarkdown } from '@/components/Markdown';
import { theme as t } from '@/theme/tokens';

export interface WidgetCaseProps {
  title: string;
  brief: string;
  /** Stable anchor name used by deep links and programmatic scroll. */
  slug?: string;
  feature?: string;
  children: React.ReactNode;
}

const Section = styled.View`
  align-self: stretch;
  margin-bottom: ${t.space.lg}px;
`;

const Header = styled.View`
  align-self: stretch;
  gap: ${t.space.xs}px;
  margin-bottom: ${t.space.md}px;
`;

const Title = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.title}px;
  line-height: ${t.lineHeight.title}px;
  color: ${t.colors.ink};
  letter-spacing: -0.2px;
  flex-shrink: 1;
`;

const Demo = styled.View`
  border-top-width: ${t.borderWidth.hairline}px;
  border-bottom-width: ${t.borderWidth.hairline}px;
  border-color: ${t.colors.border};
  padding: ${t.space.lg}px 0;
  gap: ${t.space.md}px;
`;

export function WidgetCase({ title, brief, slug, feature, children }: WidgetCaseProps) {
  return (
    <Section nativeID={slug ? `fidget-${slug}` : undefined}>
      <Header>
        {feature ? <FeatureChip>{feature}</FeatureChip> : null}
        <Title>{title}</Title>
        <InlineMarkdown variant="brief">{brief}</InlineMarkdown>
      </Header>
      <Demo>{children}</Demo>
    </Section>
  );
}
