import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Wrapper = styled.View`
  flex: 1;
  background-color: ${t.colors.bg};
`;

const Header = styled.View<{ $topInset: number }>`
  padding-top: calc(${p => p.$topInset}px + ${t.space.xl}px);
  padding-bottom: ${t.space.lg}px;
  padding-left: ${t.space.md}px;
  padding-right: ${t.space.md}px;
  gap: ${t.space.sm}px;
`;

const Title = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.display}px;
  line-height: ${t.lineHeight.display}px;
  color: ${t.colors.ink};
  letter-spacing: -0.5px;
`;

const Summary = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.brief}px;
  line-height: ${t.lineHeight.brief}px;
  color: ${t.colors.fgMuted};
`;

const Rule = styled.View`
  height: ${t.borderWidth.heavy}px;
  background-color: ${t.colors.ink};
`;

const Body = styled.View`
  padding: ${t.space.md}px ${t.space.md}px;
`;

interface Props {
  title: string;
  summary?: string;
  children: React.ReactNode;
}

export function ScreenScaffold({ title, summary, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Wrapper>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 34,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Header $topInset={insets.top}>
          <Title>{title}</Title>
          {summary ? <Summary>{summary}</Summary> : null}
        </Header>
        <Rule />
        <Body>{children}</Body>
      </ScrollView>
    </Wrapper>
  );
}
