import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * The @property rule: registered custom properties carry a typed
 * initial value and an inheritance switch. The proof is structural:
 * the first bar paints and sizes from registrations alone (nothing
 * declares the properties anywhere in the tree), and the pinned bar
 * IGNORES the parent's loud override because its registration says
 * inherits: false. If registration stopped working, the first bar
 * would collapse and the pinned bar would stretch to full width.
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

/** No --bar-* declarations exist anywhere; the registrations paint it. */
const RegisteredBar = styled.View`
  @property --bar-width {
    syntax: '<percentage>';
    inherits: true;
    initial-value: 62%;
  }
  @property --bar-tint {
    syntax: '<color>';
    inherits: true;
    initial-value: #3c7bd4;
  }
  height: 18px;
  border-radius: ${t.radius.sm}px;
  width: var(--bar-width);
  background-color: var(--bar-tint);
`;

/** Unregistered control: same var() references can only use fallbacks. */
const FallbackBar = styled.View`
  height: 18px;
  border-radius: ${t.radius.sm}px;
  width: var(--nope-width, 20%);
  background-color: var(--nope-tint, ${t.colors.fgFaint});
`;

/**
 * The parent shouts 100% through BOTH properties. The two bars below
 * register them identically except for the `inherits` flag, the one
 * controlled variable: the pinned bar never hears the parent (stays at
 * its 34% initial), the flowing bar inherits and stretches to 100%.
 * Registration is a per-property, app-wide trait, so the contrast needs
 * two distinct properties; a second bar reading the SAME non-inheriting
 * property would also (correctly) sit at the initial value.
 */
const LoudParent = styled.View`
  --pin-width: 100%;
  --flow-width: 100%;
  gap: ${t.space.xxs}px;
`;

/** inherits: false; the parent's 100% never reaches it. */
const PinnedBar = styled.View`
  @property --pin-width {
    syntax: '<percentage>';
    inherits: false;
    initial-value: 34%;
  }
  height: 18px;
  border-radius: ${t.radius.sm}px;
  width: var(--pin-width);
  background-color: light-dark(#2f7d4f, #79c89a);
`;

/** inherits: true; same initial, but the parent's 100% wins. */
const FlowingBar = styled.View`
  @property --flow-width {
    syntax: '<percentage>';
    inherits: true;
    initial-value: 34%;
  }
  height: 18px;
  border-radius: ${t.radius.sm}px;
  width: var(--flow-width);
  background-color: light-dark(#b04a4a, #e08b8b);
`;

export function PropertyRegistration() {
  return (
    <Stack>
      <Section>
        <SectionTitle>Typed initial values</SectionTitle>
        <Caption>{"@property --bar-width { syntax: '<percentage>'; initial-value: 62% }"}</Caption>
        <RegisteredBar />
        <FallbackBar />
      </Section>
      <Section>
        <SectionTitle>inherits: false vs inherits: true</SectionTitle>
        <Caption>parent sets both to 100%; only the `inherits: true` registration hears it</Caption>
        <LoudParent>
          <PinnedBar />
          <FlowingBar />
        </LoudParent>
      </Section>
    </Stack>
  );
}
