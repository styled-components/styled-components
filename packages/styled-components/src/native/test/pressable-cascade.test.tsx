/**
 * What a styled `Pressable` hands its children: the font size, line height and
 * direction its style sets at the current press state.
 */
import React from 'react';
import { Pressable } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { useNativeStyleContext } from '../';
import { DEFAULT_NATIVE_STYLE } from '../NativeStyleContext';
import { resetNativeStyleCache } from '../../models/compileNative';
import { resetResponsiveCache } from '../responsive';

beforeEach(() => {
  resetResponsiveCache();
  resetNativeStyleCache();
});

const PressSized = styled(Pressable)`
  &:active {
    font-size: 20px;
  }
`;
const PressPlain = styled(Pressable)`
  color: red;
`;

describe('a styled Pressable with no children', () => {
  it.each([
    ['a style that cannot change with press state', PressPlain],
    ['a style that changes with press state', PressSized],
  ])('gives its host no children slot for %s', (_name, Subject) => {
    let tree!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tree = TestRenderer.create(<Subject />);
    });
    const [pressable] = tree.root
      .findByType(Subject)
      .findAll(
        node =>
          node.type !== Subject &&
          node.props.testOnly_pressed === undefined &&
          node.props.style !== undefined
      );
    expect(pressable.props.children).toBeUndefined();
  });

  it('gives children that appear later the pressed value', () => {
    const seen: number[] = [];
    function Probe() {
      seen.push(useNativeStyleContext().cascade.fontSize);
      return null;
    }

    let tree!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tree = TestRenderer.create(<PressSized testOnly_pressed />);
    });
    TestRenderer.act(() =>
      tree.update(
        <PressSized testOnly_pressed>
          <Probe />
        </PressSized>
      )
    );
    TestRenderer.act(() =>
      tree.update(
        <PressSized testOnly_pressed={false}>
          <Probe />
        </PressSized>
      )
    );

    expect(seen).toEqual([20, DEFAULT_NATIVE_STYLE.cascade.fontSize]);
  });
});
