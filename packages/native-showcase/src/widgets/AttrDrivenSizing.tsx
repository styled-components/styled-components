import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * CSS Values 5 attr(). On native, attr() reads the styled component's
 * props (the same source attribute selectors match), so a plain
 * `data-size` prop drives a typed CSS value with a declared fallback.
 * The bar lengths and tints come from props the CSS reads directly; no
 * function interpolation in the template, no JS branching.
 */

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

const Caption = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.fgMuted};
`;

const Rows = styled.View`
  gap: ${t.space.xxs}px;
`;

/** Width reads the data-size prop; missing prop lands on the 48px fallback. */
const SizedBar = styled.View`
  height: 16px;
  width: attr(data-size px, 48px);
  background-color: ${t.colors.ink};
  border-radius: ${t.radius.sm}px;
`;

/** Tint reads data-tint as a <color>; bogus or absent values fall back. */
const TintedBar = styled.View`
  height: 16px;
  width: 160px;
  background-color: attr(data-tint type(<color>), light-dark(#cbd2e0, #3a4254));
  border-radius: ${t.radius.sm}px;
`;

/** attr() composes inside calc() like any other value. */
const DoubledBar = styled.View`
  height: 16px;
  width: calc(attr(data-size px, 40px) * 2);
  background-color: light-dark(#2f7d4f, #79c89a);
  border-radius: ${t.radius.sm}px;
`;

export function AttrDrivenSizing() {
  return (
    <Stack>
      <Section>
        <SectionTitle>Typed props as lengths</SectionTitle>
        <Caption>width: attr(data-size px, 48px)</Caption>
        <Rows>
          <SizedBar data-size={64} />
          <SizedBar data-size={128} />
          <SizedBar data-size={224} />
          {/* No prop: the 48px fallback IS the short bar. */}
          <SizedBar />
        </Rows>
      </Section>
      <Section>
        <SectionTitle>Typed props as colors</SectionTitle>
        <Caption>{'background-color: attr(data-tint type(<color>), …)'}</Caption>
        <Rows>
          <TintedBar data-tint="#d4763c" />
          <TintedBar data-tint="#3c7bd4" />
          {/* A length is not a <color>: falls back to the muted tint. */}
          <TintedBar data-tint="12px" />
        </Rows>
      </Section>
      <Section>
        <SectionTitle>Composes in calc()</SectionTitle>
        <Caption>width: calc(attr(data-size px, 40px) * 2)</Caption>
        <Rows>
          <DoubledBar data-size={60} />
          <DoubledBar />
        </Rows>
      </Section>
    </Stack>
  );
}
