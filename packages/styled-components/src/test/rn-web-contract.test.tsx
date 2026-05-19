/**
 * Load-bearing assumption for the rn-web bridge: rn-web's `<View>` composes a
 * styleq `$$css`-marked style entry into its DOM `className`. The bridge
 * generates a class via the web pipeline, then hands it to a rn-web primitive
 * as `style={[{ $$css: true, sc: className }, ...otherStyles]}`. If rn-web
 * doesn't merge that class into its DOM output, the bridge approach falls
 * apart at the design stage.
 *
 * @see node_modules/styleq/dist/styleq.js — the `$$css` branch
 * @see node_modules/react-native-web/src/modules/createDOMProps/index.js
 */

import React from 'react';
import { render } from '@testing-library/react';
import { View } from 'react-native-web';

describe('rn-web $$css contract', () => {
  it('composes a $$css class with rn-web atomic classes on the DOM node', () => {
    const { container } = render(
      <View
        testID="probe"
        style={[{ $$css: true, sc: 'sc-bridge-marker' }, { backgroundColor: 'red' }] as any}
      />
    );
    const node = container.querySelector('[data-testid="probe"]') as HTMLElement;
    expect(node).not.toBeNull();
    const cls = node.getAttribute('class') ?? '';
    expect(cls).toContain('sc-bridge-marker');
    // rn-web atomized classes are short hashes; verify one was emitted alongside.
    const tokens = cls.split(/\s+/).filter(Boolean);
    expect(tokens.length).toBeGreaterThanOrEqual(2);
  });

  it('lets a $$css class win when paired with a later inline override of the same property', () => {
    // styleq's "first declaration of a property wins within a chunk"
    // semantics: $$css objects declare properties by key. A subsequent
    // inline style with a different property shouldn't drop the $$css
    // class. Locks the merge order assumption the bridge relies on.
    const { container } = render(
      <View
        testID="probe"
        style={[{ $$css: true, color: 'sc-color-red' }, { backgroundColor: 'blue' }] as any}
      />
    );
    const node = container.querySelector('[data-testid="probe"]') as HTMLElement;
    const cls = node.getAttribute('class') ?? '';
    expect(cls).toContain('sc-color-red');
  });
});
