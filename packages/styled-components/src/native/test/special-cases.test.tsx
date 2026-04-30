import React from 'react';
import { Text, TextInput, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled from '../';
import { resetStyleCache } from '../../models/NativeStyle';

describe('special-case props (style → top-level prop lift)', () => {
  beforeEach(() => {
    resetStyleCache();
  });

  describe('line-clamp → numberOfLines', () => {
    it('lifts line-clamp to numberOfLines on a styled Text', () => {
      const Clamped = styled.Text`
        line-clamp: 2;
      `;
      const tree = TestRenderer.create(<Clamped>long text</Clamped>);
      const text = tree.root.findByType(Text);
      expect(text.props.numberOfLines).toBe(2);
      // overflow stays in the style object since RN's Text reads it as a style key.
      const flat = ([] as any[])
        .concat(text.props.style ?? [])
        .flat(Infinity)
        .filter(Boolean);
      expect(flat).toContainEqual({ overflow: 'hidden' });
      // The lifted prop must NOT remain in any style entry.
      for (const entry of flat) expect(entry.numberOfLines).toBeUndefined();
    });

    it('lifts line-clamp on a doubly-wrapped Text (deep target detection)', () => {
      const InnerText = styled.Text``;
      const Clamped = styled(InnerText)`
        line-clamp: 3;
      `;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const tree = TestRenderer.create(<Clamped>long text</Clamped>);
        const text = tree.root.findByType(Text);
        expect(text.props.numberOfLines).toBe(3);
        // Walking through the inner styled-component should NOT trigger
        // the misuse warning — leaf is still <Text>.
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('lifts line-clamp to numberOfLines on a styled TextInput', () => {
      const Clamped = styled.TextInput`
        line-clamp: 1;
      `;
      const tree = TestRenderer.create(<Clamped value="x" onChangeText={() => {}} />);
      const input = tree.root.findByType(TextInput);
      expect(input.props.numberOfLines).toBe(1);
    });

    it('user numberOfLines prop wins over compiled line-clamp', () => {
      const Clamped = styled.Text`
        line-clamp: 2;
      `;
      const tree = TestRenderer.create(<Clamped numberOfLines={5}>x</Clamped>);
      const text = tree.root.findByType(Text);
      expect(text.props.numberOfLines).toBe(5);
    });

    it('warns once when line-clamp is applied to a non-Text element', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const Bad = styled.View`
          line-clamp: 2;
        `;
        const tree = TestRenderer.create(<Bad />);
        // Render a second time to confirm the warning is once-only per component.
        tree.update(<Bad />);
        const view = tree.root.findByType(View);
        // The prop is still lifted (so behavior is consistent with what the
        // compiler decided), but the warning tells the developer it does
        // nothing on <View>.
        expect(view.props.numberOfLines).toBe(2);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const message = warnSpy.mock.calls[0][0] as string;
        expect(message).toContain('line-clamp');
        expect(message).toContain('<Text>');
        expect(message).toContain('<View>');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('warns at compile time when line-clamp is nested inside @media', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const Comp = styled.Text`
          color: red;
          @media (min-width: 500px) {
            line-clamp: 2;
          }
        `;
        const tree = TestRenderer.create(<Comp>x</Comp>);
        const text = tree.root.findByType(Text);
        // The conditional line-clamp is silently dropped (warned), so
        // the rendered Text has no numberOfLines from the nested rule.
        expect(text.props.numberOfLines).toBeUndefined();
        const conditionalWarning = warnSpy.mock.calls.find(
          call => typeof call[0] === 'string' && call[0].includes('@media')
        );
        expect(conditionalWarning).toBeDefined();
        expect(conditionalWarning![0]).toContain('line-clamp');
        expect(conditionalWarning![0]).toContain('top level');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('does not include numberOfLines in the registered StyleSheet entry', () => {
      const Comp = styled.Text`
        color: red;
        line-clamp: 2;
      `;
      const tree = TestRenderer.create(<Comp>x</Comp>);
      const text = tree.root.findByType(Text);
      // style here is whatever composeBase returned (array form when user
      // style is undefined, since composeBase wraps base + undefined).
      const flat = ([] as any[])
        .concat(text.props.style ?? [])
        .flat(Infinity)
        .filter(Boolean);
      for (const entry of flat) {
        expect(entry.numberOfLines).toBeUndefined();
      }
    });
  });
});
