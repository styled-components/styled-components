/* eslint-disable no-console, react/jsx-key, @typescript-eslint/no-empty-function */
import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-primitives';
import TestRenderer from 'react-test-renderer';
import styled, { ThemeProvider } from '../index';

// NOTE: These tests are copy pasted from ../native/test/native.test.js

describe('primitives', () => {
  it('should not throw an error when called with a valid element', () => {
    expect(() => styled.View``).not.toThrowError();

    const FunctionalComponent = () => <View />;
    class ClassComponent extends React.Component {
      render() {
        return <View />;
      }
    }
    const validComps = ['View', FunctionalComponent, ClassComponent];
    validComps.forEach(comp => {
      expect(() => {
        const Comp = styled(comp)``;
        TestRenderer.create(<Comp />);
      }).not.toThrowError();
    });
  });

  it('should generate inline styles', () => {
    const Comp = styled.View``;
    const wrapper = TestRenderer.create(<Comp />);
    // @ts-expect-error valid input
    const view = wrapper.root.findByType('View');

    expect(view.props.style).toEqual({});
  });

  it('should fold successive styled() wrappings', () => {
    const Comp = styled.Text`
      color: red;
    `;

    const Comp2 = styled(Comp)`
      text-align: left;
    `;

    const wrapper = TestRenderer.create(<Comp2 />);
    // @ts-expect-error valid input
    const view = wrapper.root.findByType('Text');

    expect(view.props.style).toEqual({ color: 'red', textAlign: 'left' });
  });

  it('should combine inline styles and the style prop', () => {
    const Comp = styled.View`
      padding-top: 10px;
    `;

    const style = { opacity: 0.9 };
    const wrapper = TestRenderer.create(<Comp style={style} />);
    // @ts-expect-error valid input
    const view = wrapper.root.findByType('View');

    expect(view.props.style).toEqual([{ paddingTop: 10 }, style]);
  });

  describe('attrs', () => {
    it('works fine with an empty object', () => {
      const Comp = styled.View.attrs(() => ({}))``;
      const wrapper = TestRenderer.create(<Comp />);
      // @ts-expect-error valid input
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: {},
      });
    });

    it('passes simple props on', () => {
      const Comp = styled.View.attrs(() => ({
        test: true,
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      // @ts-expect-error valid input
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: {},
        test: true,
      });
    });

    it('calls an attr-function with context', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const Comp = styled.View.attrs(p => ({
        copy: p.test,
      }))``;

      const test = 'Put that cookie down!';
      const wrapper = TestRenderer.create(<Comp test={test} />);
      // @ts-expect-error valid input
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: {},
        copy: test,
        test,
      });
    });

    it('merges multiple calls', () => {
      const Comp = styled.View.attrs(() => ({
        first: 'first',
        test: '_',
      })).attrs(() => ({
        second: 'second',
        test: 'test',
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      // @ts-expect-error valid input
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: {},
        first: 'first',
        second: 'second',
        test: 'test',
      });
    });

    it('merges multiple fn calls', () => {
      const Comp = styled.View.attrs(() => ({
        first: 'first',
        test: '_',
      })).attrs(() => ({
        second: 'second',
        test: 'test',
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      // @ts-expect-error valid input
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: {},
        first: 'first',
        second: 'second',
        test: 'test',
      });
    });

    it('merges attrs when inheriting SC', () => {
      const Parent = styled.View.attrs(() => ({
        first: 'first',
      }))``;

      const Child = styled(Parent).attrs(() => ({
        second: 'second',
      }))``;

      const wrapper = TestRenderer.create(<Child />);
      // @ts-expect-error valid input
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: {},
        first: 'first',
        second: 'second',
      });
    });

    it('should pass through children as a normal prop', () => {
      const Comp = styled.Text.attrs(() => ({
        children: 'Probably a bad idea',
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      // @ts-expect-error valid input
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: 'Probably a bad idea',
        style: {},
      });
    });

    it('should pass through complex children as well', () => {
      const child = <Text>Probably a bad idea</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      // @ts-expect-error valid input
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: child,
        style: {},
      });
    });

    it('should override children', () => {
      const child = <Text>Amazing</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      // @ts-expect-error valid input
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: child,
        style: {},
      });
    });

    it('accepts a function', () => {
      const child = <Text>Amazing</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      // @ts-expect-error valid input
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: child,
        style: {},
      });
    });

    it('function form allows access to theme', () => {
      const Comp = styled.Text.attrs(props => ({
        'data-color': props.theme.color,
      }))``;

      const wrapper = TestRenderer.create(
        <ThemeProvider theme={{ color: 'red' }}>
          <Comp>Something else</Comp>
        </ThemeProvider>
      );

      // @ts-expect-error valid input
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: 'Something else',
        'data-color': 'red',
        style: {},
      });
    });
  });

  describe('expanded API', () => {
    it('should attach a displayName', () => {
      const Dummy = (props: PropsWithChildren<{}>) => <View {...props} />;
      Dummy.displayName = 'Dummy';
      const Comp = styled(Dummy)``;
      expect(Comp.displayName).toBe('Styled(Dummy)');

      const CompTwo = styled.View.withConfig({ displayName: 'Test' })``;
      expect(CompTwo.displayName).toBe('Test');
    });

    it('should allow multiple calls to be chained', () => {
      const Comp = styled.View.withConfig({ displayName: 'Test1' }).withConfig({
        displayName: 'Test2',
      })``;

      expect(Comp.displayName).toBe('Test2');
    });

    it('"as" prop should change the rendered element without affecting the styling', () => {
      // @ts-expect-error any prop can be passed
      const OtherText = (props: PropsWithChildren<{}>) => <Text {...props} foo />;

      const Comp = styled.Text`
        color: red;
      `;

      const wrapper = TestRenderer.create(<Comp as={OtherText} />);
      // @ts-expect-error valid input
      const view = wrapper.root.findByType('Text');

      expect(view.props).toHaveProperty('foo');
      expect(view.props.style).toEqual({ color: 'red' });
    });

    it('withComponent should work', () => {
      const Dummy = (props: PropsWithChildren<{}>) => <View {...props} />;

      const Comp = styled.View.withConfig({
        displayName: 'Comp',
        componentId: 'OMGLOL',
      })``.withComponent(Text);

      const Comp2 = styled.View.withConfig({
        displayName: 'Comp2',
        componentId: 'OMFG',
      })``.withComponent(Dummy);

      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot();
      expect(TestRenderer.create(<Comp2 />).toJSON()).toMatchSnapshot();
    });
  });
});
