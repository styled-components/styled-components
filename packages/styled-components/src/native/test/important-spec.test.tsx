// CSS Cascade and Inheritance Module Level 4 — `!important` semantics
// applied to the within-component native cascade. Editor's draft fetched
// to /tmp/css-cascade.html for this session.
//
// Scope intentionally narrowed for v1:
//   - Within a single styled component (base + matched conditional
//     buckets), `!important` declarations beat normal ones regardless
//     of source order or which bucket they originated in.
//   - The `style={{}}` prop is still applied last and wins over
//     `!important` from the styled component itself; that surface is
//     the runtime escape hatch and is documented as a deliberate
//     deviation from strict spec cascade origins.
//   - Cross-component cascade of `!important` (a parent's `!important
//     font-size` defeating a child's normal one) is out of v1 scope.

import React from 'react';
import TestRenderer from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';

import styled, { css } from '..';
import { resetWarningsForTest } from '../transform/dev';

function styleOf(El: React.ComponentType<any>, props: object = {}): any {
  const tree = TestRenderer.create(React.createElement(El, props));
  // Flatten so a single object is observable regardless of whether the
  // engine emitted an array (conditional / pseudo / important overlays)
  // or a flat object (pure static base).
  return StyleSheet.flatten(tree.root.findByType(View).props.style);
}

describe('native !important spec compliance (CSS Cascade L4 §3 + §6.2)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // §6.2: "An important declaration takes precedence over a normal
  // declaration." Spec example uses `[hidden] { display: none
  // !important; }`. Within a single styled component, the marker must
  // make the value apply cleanly and survive any later normal
  // declaration of the same property.
  it('strips !important from the rendered value (no leaked marker)', () => {
    const Box = styled(View)`
      color: red !important;
    `;
    expect(styleOf(Box).color).toBe('red');
  });

  it('an !important declaration beats a later normal one (within-component)', () => {
    const Box = styled(View)`
      color: red !important;
      color: blue;
    `;
    expect(styleOf(Box).color).toBe('red');
  });

  it('an !important declaration beats an earlier normal one (within-component)', () => {
    const Box = styled(View)`
      color: blue;
      color: red !important;
    `;
    // Spec-trivial when later wins anyway, but locks the ordering
    // independence of importance.
    expect(styleOf(Box).color).toBe('red');
  });

  it('between two !important declarations, the later one wins', () => {
    const Box = styled(View)`
      color: red !important;
      color: green !important;
    `;
    expect(styleOf(Box).color).toBe('green');
  });

  // §3: "Declaring a shorthand property to be !important is equivalent
  // to declaring all of its sub-properties to be !important."
  // Use the two-value form so the polyfill expands to longhands (RN
  // accepts `padding: 4` directly, so the single-value form stays as
  // one key and the per-longhand assertion would be vacuous).
  it('a shorthand !important propagates to every longhand sub-property', () => {
    const Box = styled(View)`
      padding: 16px 8px;
      padding: 4px 2px !important;
    `;
    const style = styleOf(Box);
    expect(style.paddingTop).toBe(4);
    expect(style.paddingRight).toBe(2);
    expect(style.paddingBottom).toBe(4);
    expect(style.paddingLeft).toBe(2);
  });

  it('a longhand !important beats a later shorthand normal declaration', () => {
    const Box = styled(View)`
      padding-top: 12px !important;
      padding: 4px 8px;
    `;
    const style = styleOf(Box);
    expect(style.paddingTop).toBe(12);
    expect(style.paddingRight).toBe(8);
    expect(style.paddingBottom).toBe(4);
    expect(style.paddingLeft).toBe(8);
  });

  // §6.2 sentence on later !important within matched buckets: a
  // conditional bucket's !important still defers to a later bucket's
  // !important. The base bucket is "earlier" than matched media/hover
  // buckets in our model.
  it('a conditional bucket !important beats the base bucket !important', () => {
    const Box = styled(View)`
      color: red !important;
      @media (min-width: 0px) {
        color: green !important;
      }
    `;
    expect(styleOf(Box).color).toBe('green');
  });

  it('a conditional bucket !important beats the base bucket normal', () => {
    const Box = styled(View)`
      color: blue;
      @media (min-width: 0px) {
        color: red !important;
      }
    `;
    expect(styleOf(Box).color).toBe('red');
  });

  it('a base bucket !important beats a matched conditional bucket normal', () => {
    const Box = styled(View)`
      color: red !important;
      @media (min-width: 0px) {
        color: blue;
      }
    `;
    expect(styleOf(Box).color).toBe('red');
  });

  it('a base bucket !important beats a matched pseudo-state bucket normal (:active)', () => {
    const Press = styled.Pressable`
      background-color: tomato !important;
      &:active {
        background-color: royalblue;
        opacity: 0.5;
      }
    `;
    const tree = TestRenderer.create(<Press />);
    // Pressable hosts get a function-form style that resolves with live
    // press state; find the element carrying it.
    const styledEl = tree.root.find(n => typeof n.props.style === 'function' && n.type !== Press);
    const styleProp = styledEl.props.style;
    const resolve = (state: { pressed: boolean }) => StyleSheet.flatten(styleProp(state));
    const pressed = resolve({ pressed: true });
    // The bucket itself fired (its other declaration landed)...
    expect(pressed.opacity).toBe(0.5);
    // ...but its normal background-color loses to the base !important.
    expect(pressed.backgroundColor).toBe('tomato');
    expect(resolve({ pressed: false }).backgroundColor).toBe('tomato');
  });

  // Case insensitivity: `!IMPORTANT` and `! important` are equivalent
  // per CSS Syntax 3 tokenization.
  // Inputs are interpolated so the linter doesn't normalize the
  // canonical-vs-variant token form away.
  it('matches `!IMPORTANT` case-insensitively', () => {
    const Box = styled(View)`
      color: red ${'!IMPORTANT'};
      color: blue;
    `;
    expect(styleOf(Box).color).toBe('red');
  });

  it('tolerates whitespace between `!` and `important`', () => {
    const Box = styled(View)`
      color: red ${'! important'};
      color: blue;
    `;
    expect(styleOf(Box).color).toBe('red');
  });

  // CSS Cascade L4 §6.4 + §6.2: inline declarations from the style
  // attribute are author-origin; an author !important declaration still
  // beats a normal inline one. The styled component's !important must
  // therefore win over the runtime `style` prop's normal value, matching
  // the web's behavior for the same source CSS.
  it('a styled !important beats the user `style` prop (spec-aligned)', () => {
    const Box = styled(View)`
      color: red !important;
    `;
    const tree = TestRenderer.create(<Box style={{ color: 'gold' }} />);
    const flat = StyleSheet.flatten(tree.root.findByType(View).props.style);
    expect(flat.color).toBe('red');
  });

  it('user `style` prop still wins over a styled NORMAL declaration', () => {
    const Box = styled(View)`
      color: red;
    `;
    const tree = TestRenderer.create(<Box style={{ color: 'gold' }} />);
    const flat = StyleSheet.flatten(tree.root.findByType(View).props.style);
    expect(flat.color).toBe('gold');
  });

  // Mixin import: a css`` fragment carrying !important contributes the
  // flag to the parent's bucket so the cascade ordering is consistent.
  it('an !important inside an imported css`` fragment beats the surrounding normal', () => {
    const accent = css`
      color: red !important;
    `;
    const Box = styled(View)`
      ${accent}
      color: blue;
    `;
    expect(styleOf(Box).color).toBe('red');
  });

  // Cascade through Text: a `Text` styled component with an !important
  // text property still applies cleanly.
  it('applies on Text properties', () => {
    const Label = styled(Text)`
      font-size: 12px;
      font-size: 20px !important;
    `;
    const tree = TestRenderer.create(<Label>hi</Label>);
    const txt = tree.root.findByType(Text);
    const flat = StyleSheet.flatten(txt.props.style);
    expect(flat.fontSize).toBe(20);
  });
});
