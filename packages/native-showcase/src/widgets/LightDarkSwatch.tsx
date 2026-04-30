import React from 'react';
import { Appearance } from 'react-native';
import { useSyncExternalStore } from 'react';
import styled, { useMediaQuery } from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

function subscribe(cb: () => void) {
  const sub = Appearance.addChangeListener(cb);
  return () => sub.remove();
}

function useOSScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribe,
    () => (Appearance.getColorScheme() ?? 'light') as 'light' | 'dark',
    () => 'light'
  );
}

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.xs}px;
`;

const Hint = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: 12px;
  line-height: 17px;
  color: ${t.colors.fgFaint};
`;

const Swatch = styled.View`
  flex: 1;
  padding: ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  gap: ${t.space.xxs}px;
`;

const FunctionSwatch = styled(Swatch)`
  background-color: light-dark(#fafafa, #1a1a1a);
`;

const FunctionTitle = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: light-dark(#0e0e10, #f5f3ee);
`;

const FunctionBody = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: 13px;
  line-height: 18px;
  color: light-dark(#56565b, #a8a8ac);
`;

const MediaSwatch = styled(Swatch)`
  background-color: #fafafa;

  @media (prefers-color-scheme: dark) {
    background-color: #1a1a1a;
  }
`;

const MediaTitle = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #0e0e10;

  @media (prefers-color-scheme: dark) {
    color: #f5f3ee;
  }
`;

const MediaBody = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: 13px;
  line-height: 18px;
  color: #56565b;

  @media (prefers-color-scheme: dark) {
    color: #a8a8ac;
  }
`;

export function LightDarkSwatch() {
  const scheme = useOSScheme();
  const matchesDark = useMediaQuery('(prefers-color-scheme: dark)');
  return (
    <>
      <StateReadout
        entries={[
          { key: 'OS color-scheme', value: scheme },
          { key: 'rule', value: '@media (prefers-color-scheme: dark)' },
        ]}
        badge={{
          tone: matchesDark ? 'pass' : 'neutral',
          label: matchesDark ? 'DARK · uses dark branch' : 'LIGHT · uses light branch',
        }}
      />
      <Row>
        <FunctionSwatch>
          <FunctionTitle>light-dark()</FunctionTitle>
          <FunctionBody>One declaration; the function picks the branch.</FunctionBody>
        </FunctionSwatch>
        <MediaSwatch>
          <MediaTitle>@media</MediaTitle>
          <MediaBody>Two CSS branches; media query gates which fires.</MediaBody>
        </MediaSwatch>
      </Row>
      <Hint>
        Both branches follow the OS color scheme. In the iOS simulator press ⇧⌘A to toggle, or
        flip Settings → Developer → Dark Appearance.
      </Hint>
    </>
  );
}
