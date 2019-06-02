// @flow
import React from 'react';
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

  it('should throw a meaningful error when called with an invalid element', () => {
    const FunctionalComponent = () => <View />;
    class ClassComponent extends React.Component {
      render() {
        return <View />;
      }
    }
    const invalidComps = [
      undefined,
      null,
      123,
      [],
      <View />,
      <FunctionalComponent />,
      <ClassComponent />,
    ];
    invalidComps.forEach(comp => {
      expect(() => {
        // $FlowInvalidInputTest
        const Comp = styled(comp)``;
        TestRenderer.create(<Comp />);
        // $FlowInvalidInputTest
      }).toThrow(`Cannot create styled-component for component: ${comp}`);
    });
  });

  it('should generate inline styles', () => {
    const Comp = styled.View``;
    const wrapper = TestRenderer.create(<Comp />);
    const view = wrapper.root.findByType('View');

    expect(view.props.style).toEqual([{}]);
  });

  it('should fold successive styled() wrappings', () => {
    const Comp = styled.Text`
      color: red;
    `;

    const Comp2 = styled(Comp)`
      text-align: left;
    `;

    const wrapper = TestRenderer.create(<Comp2 />);
    const view = wrapper.root.findByType('Text');

    expect(view.props.style).toEqual([{ color: 'red', textAlign: 'left' }]);
  });

  it('should combine inline styles and the style prop', () => {
    const Comp = styled.View`
      padding-top: 10;
    `;

    const style = { opacity: 0.9 };
    const wrapper = TestRenderer.create(<Comp style={style} />);
    const view = wrapper.root.findByType('View');

    expect(view.props.style).toEqual([{ paddingTop: 10 }, style]);
  });

  describe('attrs', () => {
    it('works fine with an empty object', () => {
      const Comp = styled.View.attrs({})``;
      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
      });
    });

    it('passes simple props on', () => {
      const Comp = styled.View.attrs({
        test: true,
      })``;

      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
        test: true,
      });
    });

    it('calls an attr-function with context', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const Comp = styled.View.attrs({
        copy: props => props.test,
      })``;

      const test = 'Put that cookie down!';
      const wrapper = TestRenderer.create(<Comp test={test} />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
        copy: test,
        test,
      });
    });

    it('merges multiple calls', () => {
      const Comp = styled.View.attrs({
        first: 'first',
        test: '_',
      }).attrs({
        second: 'second',
        test: 'test',
      })``;

      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
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
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
        first: 'first',
        second: 'second',
        test: 'test',
      });
    });

    it('merges attrs when inheriting SC', () => {
      const Parent = styled.View.attrs({
        first: 'first',
      })``;

      const Child = styled(Parent).attrs({
        second: 'second',
      })``;

      const wrapper = TestRenderer.create(<Child />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
        first: 'first',
        second: 'second',
      });
    });

    it('should pass through children as a normal prop', () => {
      const Comp = styled.Text.attrs({
        children: 'Probably a bad idea',
      })``;

      const wrapper = TestRenderer.create(<Comp />);
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: 'Probably a bad idea',
        style: [{}],
      });
    });

    it('should pass through complex children as well', () => {
      const Comp = styled.Text.attrs({
        children: <Text>Probably a bad idea</Text>,
      })``;

      const wrapper = TestRenderer.create(<Comp />);
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: <Text>Probably a bad idea</Text>,
        style: [{}],
      });
    });

    it('should override children', () => {
      const child = <Text>Amazing</Text>;
      const Comp = styled.Text.attrs({
        children: child,
      })``;

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: child,
        style: [{}],
      });
    });

    it('accepts a function', () => {
      const child = <Text>Amazing</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: child,
        style: [{}],
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
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: 'Something else',
        'data-color': 'red',
        style: [{}],
      });
    });
  });

  describe('expanded API', () => {
    it('should attach a displayName', () => {
      View.displayName = 'View';
      const Comp = styled.View``;
      expect(Comp.displayName).toBe('Styled(View)');

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
      const OtherText = props => <Text {...props} foo />;

      const Comp = styled.Text`
        color: red;
      `;

      const wrapper = TestRenderer.create(<Comp as={OtherText} />);
      const view = wrapper.root.findByType('Text');

      expect(view.props).toHaveProperty('foo');
      expect(view.props.style).toEqual([{ color: 'red' }]);
    });

    it('withComponent should work', () => {
      const Dummy = props => <View {...props} />;

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

  describe('warnings', () => {
    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      console.warn.mockClear();
    });

    it('warns upon use of the removed "innerRef" prop', () => {
      const Comp = styled.View``;
      const ref = React.createRef();

      TestRenderer.create(<Comp innerRef={ref} />);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('The "innerRef" API has been removed')
      );
    });

    it('warns upon use of a Stateless Functional Component as a prop for attrs', () => {
      const Inner = () => <Text />;
      const Comp = styled.Text.attrs({ component: Inner })``;

      TestRenderer.create(<Comp />);

      expect(console.warn.mock.calls[1][0]).toMatchInlineSnapshot(`
        "It looks like you've used a non styled-component as the value for the \\"component\\" prop in an object-form attrs constructor of \\"Styled(Text)\\".
        You should use the new function-form attrs constructor which avoids this issue: attrs(props => ({ yourStuff }))
        To continue using the deprecated object syntax, you'll need to wrap your component prop in a function to make it available inside the styled component (you'll still get the deprecation warning though.)
        For example, { component: () => InnerComponent } instead of { component: InnerComponent }"
      `);
    });

    it('warns for using fns as attrs object keys', () => {
      const Comp = styled.View.attrs({ 'data-text-color': props => props.textColor })``;

      TestRenderer.create(<Comp textColor="blue" />);

      expect(console.warn.mock.calls[0][0]).toMatchInlineSnapshot(
        `"Functions as object-form attrs({}) keys are now deprecated and will be removed in a future version of styled-components. Switch to the new attrs(props => ({})) syntax instead for easier and more powerful composition. The attrs key in question is \\"data-text-color\\" on component \\"Styled(View)\\"."`
      );
      expect(console.warn.mock.calls[0][1]).toEqual(expect.stringMatching(/^\s+Error\s+at/));
    });
  });
});
