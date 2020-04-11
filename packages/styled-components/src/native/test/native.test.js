// @flow
/* eslint-disable no-console */
import { Text, View } from 'react-native';
import React from 'react';
import TestRenderer from 'react-test-renderer';

import styled, { ThemeProvider } from '../index';

// NOTE: These tests are like the ones for Web but a "light-version" of them
// This is mostly due to the similar logic

describe('native', () => {
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

  it('folds defaultProps', () => {
    const Inner = styled.View``;

    Inner.defaultProps = {
      theme: {
        fontSize: 12,
      },
      style: {
        background: 'blue',
        textAlign: 'center',
      },
    };

    const Outer = styled(Inner)``;

    Outer.defaultProps = {
      theme: {
        fontSize: 16,
      },
      style: {
        background: 'silver',
      },
    };

    expect(Outer.defaultProps).toMatchInlineSnapshot(`
Object {
  "style": Object {
    "background": "silver",
    "textAlign": "center",
  },
  "theme": Object {
    "fontSize": 16,
  },
}
`);
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

  it('should not console.warn if a comment is seen', () => {
    const oldConsoleWarn = console.warn;
    console.warn = jest.fn();
    try {
      // eslint-disable-next-line no-unused-expressions
      styled.View`
        /* this is a comment */
      `;

      expect(console.warn).not.toHaveBeenCalled();
    } finally {
      console.warn = oldConsoleWarn;
    }
  });

  // https://github.com/styled-components/styled-components/issues/1266
  it('should update when props change', () => {
    const Comp = styled.View`
      padding-top: 5px;
      opacity: ${p => p.opacity || 0};
    `;

    const wrapper = TestRenderer.create(<Comp opacity={0.5} />);

    expect(wrapper.root.findByType('View').props.style).toEqual([{ paddingTop: 5, opacity: 0.5 }]);

    wrapper.update(<Comp opacity={0.9} />);

    expect(wrapper.root.findByType('View').props.style).toEqual([{ paddingTop: 5, opacity: 0.9 }]);
  });

  it('should forward the "as" prop if "forwardedAs" is used', () => {
    const Comp = ({ as: Component = View, ...props }) => <Component {...props} />;

    const Comp2 = styled(Comp)`
      background: red;
    `;

    const wrapper = TestRenderer.create(<Comp2 forwardedAs={Text} />);

    expect(wrapper.root.findByType('Text')).not.toBeUndefined();
  });

  describe('attrs', () => {
    beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));

    it('works fine with an empty object', () => {
      const Comp = styled.View.attrs(() => ({}))``;
      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
      });
    });

    it('passes simple props on', () => {
      const Comp = styled.View.attrs(() => ({
        test: true,
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toEqual({
        style: [{}],
        test: true,
      });
    });

    it('calls an attr-function with context', () => {
      const Comp = styled.View.attrs(p => ({
        copy: p.test,
      }))``;

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
      const Parent = styled.View.attrs(() => ({
        first: 'first',
      }))``;

      const Child = styled(Parent).attrs(() => ({
        second: 'second',
      }))``;

      const wrapper = TestRenderer.create(<Child />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toMatchObject({
        style: [{}],
        first: 'first',
        second: 'second',
      });
    });

    it('should pass through children as a normal prop', () => {
      const Comp = styled.Text.attrs(() => ({
        children: 'Probably a bad idea',
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: 'Probably a bad idea',
        style: [{}],
      });
    });

    it('should pass through complex children as well', () => {
      const child = <Text>Probably a bad idea</Text>;
      const Comp = styled.Text.attrs(() => ({
        children: child,
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: child,
        style: [{}],
      });
    });

    it('should override children', () => {
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

    it('theme prop works', () => {
      const Comp = styled.Text`
        color: ${({ theme }) => theme.myColor};
      `;

      const wrapper = TestRenderer.create(<Comp theme={{ myColor: 'red' }}>Something else</Comp>);
      const text = wrapper.root.findByType('Text');

      expect(text.props.style).toMatchObject([{ color: 'red' }]);
    });

    it('theme in defaultProps works', () => {
      const Comp = styled.Text`
        color: ${({ theme }) => theme.myColor};
      `;
      Comp.defaultProps = { theme: { myColor: 'red' } };

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      const text = wrapper.root.findByType('Text');

      expect(text.props.style).toMatchObject([{ color: 'red' }]);
    });
  });

  describe('expanded API', () => {
    it('should attach a displayName', () => {
      View.displayName = 'View';

      const Comp = styled(View)``;

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

    it('should omit transient props', () => {
      const Comp = styled.Text`
        color: ${p => p.$color};
      `;

      expect(TestRenderer.create(<Comp $color="red" />).toJSON()).toMatchSnapshot();
    });

    it('allows for custom prop filtering for elements', () => {
      const Comp = styled('View').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop)
      })`
      color: red;
    `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType('View');
      expect(props.style).toEqual([{ color: 'red' }]);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('allows custom prop filtering for components', () => {
      const InnerComp = props => <View {...props} />
      const Comp = styled(InnerComp).withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop)
      })`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType('View');
      expect(props.style).toEqual([{ color: 'red' }]);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('composes shouldForwardProp on composed styled components', () => {
      const StyledView = styled.View.withConfig({
        shouldForwardProp: prop => prop === 'passThru'
      })`
        color: red;
      `;
      const ComposedView = styled(StyledView).withConfig({
        shouldForwardProp: () => true
      })``;
      const wrapper = TestRenderer.create(<ComposedView filterThis passThru />);
      const { props } = wrapper.root.findByType('View');
      expect(props.passThru).toBeDefined();
      expect(props.filterThis).toBeUndefined();
    });

    it('should filter out props when using "as" to a custom component', () => {
      const AsComp = props => <View {...props} />
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop)
      })`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);

      expect(props.style).toEqual([{ color: 'red' }]);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('can set computed styles based on props that are being filtered out', () => {
      const AsComp = props => <View {...props} />
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop)
      })`
        color: ${props => props.filterThis === 'abc' ? 'red' : undefined};
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);

      expect(props.style).toEqual([{ color: 'red' }]);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('should filter our props when using "as" to a different element', () => {
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop)
      })`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as="a" filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType("a");

      expect(props.style).toEqual([{ color: 'red' }]);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('should prefer transient $as over as', () => {
      const OtherText = props => <Text {...props} foo />;

      const Comp = styled.Text`
        color: red;
      `;

      const wrapper = TestRenderer.create(<Comp $as="View" as={OtherText} />);
      const view = wrapper.root.findByType('View');

      expect(view.props.style).toEqual([{ color: 'red' }]);
      expect(() => wrapper.root.findByType('Text')).toThrowError();
    });
  });
});
