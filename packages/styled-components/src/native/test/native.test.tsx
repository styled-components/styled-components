/* eslint-disable no-console, react/jsx-key, @typescript-eslint/no-empty-function */
import React, { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import styled, { ThemeProvider } from '../';

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
        // @ts-expect-error invalid input
        const Comp = styled(comp)``;
        TestRenderer.create(<Comp />);
      }).not.toThrowError();
    });
  });

  it('should generate inline styles', () => {
    const Comp = styled.View``;
    const wrapper = TestRenderer.create(<Comp />);
    const view = wrapper.root.findByType(View);

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
    const view = wrapper.root.findByType(Text);

    expect(view.props.style).toEqual({ color: 'red', textAlign: 'left' });
  });

  it('folds defaultProps', () => {
    const Inner = styled.View``;

    Inner.defaultProps = {
      theme: {
        fontSize: 12,
      },
      style: {
        backgroundColor: 'blue',
      },
    };

    const Outer = styled(Inner)``;

    Outer.defaultProps = {
      theme: {
        fontSize: 16,
      },
      style: {
        backgroundColor: 'silver',
      },
    };

    expect(Outer.defaultProps).toMatchInlineSnapshot(`
      Object {
        "style": Object {
          "backgroundColor": "silver",
        },
        "theme": Object {
          "fontSize": 16,
        },
      }
    `);
  });

  it('should combine inline styles and the style prop', () => {
    const Comp = styled.View`
      padding-top: 10px;
    `;

    const style = { opacity: 0.9 };
    const wrapper = TestRenderer.create(<Comp style={style} />);
    const view = wrapper.root.findByType(View);

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
    const Comp = styled.View<{ opacity?: number }>`
      padding-top: 5px;
      opacity: ${p => p.opacity || 0};
    `;

    const wrapper = TestRenderer.create(<Comp opacity={0.5} />);

    expect(wrapper.root.findByType(View).props.style).toEqual({ paddingTop: 5, opacity: 0.5 });

    wrapper.update(<Comp opacity={0.9} />);

    expect(wrapper.root.findByType(View).props.style).toEqual({ paddingTop: 5, opacity: 0.9 });
  });

  it('should forward the "as" prop if "forwardedAs" is used', () => {
    const Comp = ({ as: Component = View, ...props }) => <Component {...props} />;

    const Comp2 = styled(Comp)`
      background: red;
    `;

    const wrapper = TestRenderer.create(<Comp2 forwardedAs={Text} />);

    expect(wrapper.root.findByType(Text)).not.toBeUndefined();
  });

  describe('attrs', () => {
    beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));

    it('works fine with an empty object', () => {
      const Comp = styled.View.attrs(() => ({}))``;
      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toEqual({
        style: {},
      });
    });

    it('passes simple props on', () => {
      const Comp = styled.View.attrs(() => ({
        test: true,
      }))``;

      const wrapper = TestRenderer.create(<Comp />);
      const view = wrapper.root.findByType(View);

      expect(view.props).toEqual({
        style: {},
        test: true,
      });
    });

    it('calls an attr-function with context', () => {
      const Comp = styled.View.attrs<{ copy: string; test: string }>(p => ({
        copy: p.test,
      }))``;

      const test = 'Put that cookie down!';
      const wrapper = TestRenderer.create(<Comp test={test} />);
      const view = wrapper.root.findByType(View);

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
      const view = wrapper.root.findByType(View);

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
      const view = wrapper.root.findByType(View);

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
      const view = wrapper.root.findByType(View);

      expect(view.props).toMatchObject({
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
      const text = wrapper.root.findByType(Text);

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
      const text = wrapper.root.findByType(Text);

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
      const text = wrapper.root.findByType(Text);

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
      const text = wrapper.root.findByType(Text);

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
      const text = wrapper.root.findByType(Text);

      expect(text.props).toMatchObject({
        children: 'Something else',
        'data-color': 'red',
        style: {},
      });
    });

    it('theme prop works', () => {
      const Comp = styled.Text`
        color: ${({ theme }) => theme.myColor};
      `;

      const wrapper = TestRenderer.create(<Comp theme={{ myColor: 'red' }}>Something else</Comp>);
      const text = wrapper.root.findByType(Text);

      expect(text.props.style).toMatchObject({ color: 'red' });
    });

    it('theme in defaultProps works', () => {
      const Comp = styled.Text`
        color: ${({ theme }) => theme.myColor};
      `;
      Comp.defaultProps = { theme: { myColor: 'red' } };

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      const text = wrapper.root.findByType(Text);

      expect(text.props.style).toMatchObject({ color: 'red' });
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

    it('withComponent should work', () => {
      const Dummy = (props: PropsWithChildren<{}>) => <View {...props} />;

      const Comp = styled.View.withConfig({
        displayName: 'Comp',
      })``.withComponent(Text);

      const Comp2 = styled.View.withConfig({
        displayName: 'Comp2',
      })``.withComponent(Dummy);

      expect(TestRenderer.create(<Comp />).toJSON()).toMatchInlineSnapshot(`
        <Text
          style={Object {}}
        />
      `);
      expect(TestRenderer.create(<Comp2 />).toJSON()).toMatchInlineSnapshot(`
        <View
          style={Object {}}
        />
      `);
    });

    it('"as" prop should change the rendered element without affecting the styling', () => {
      // @ts-expect-error foo is expected later in the test
      const OtherText = (props: PropsWithChildren<{}>) => <Text {...props} foo />;

      const Comp = styled.Text`
        color: red;
      `;

      const wrapper = TestRenderer.create(<Comp as={OtherText} />);
      const view = wrapper.root.findByType(Text);

      expect(view.props).toHaveProperty('foo');
      expect(view.props.style).toEqual({ color: 'red' });
    });

    it('should omit transient props', () => {
      const Comp = styled.Text<{ $color: string }>`
        color: ${p => p.$color};
      `;

      expect(TestRenderer.create(<Comp $color="red" />).toJSON()).toMatchInlineSnapshot(`
        <Text
          style={
            Object {
              "color": "red",
            }
          }
        />
      `);
    });

    it('allows for custom prop filtering for elements', () => {
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      // @ts-expect-error bs error
      const { props } = wrapper.root.findByType('View');
      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('allows custom prop filtering for components', () => {
      const InnerComp = (props: PropsWithChildren<{}>) => <View {...props} />;
      const Comp = styled(InnerComp).withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis?: string; passThru?: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      // @ts-expect-error bs error
      const { props } = wrapper.root.findByType('View');
      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('composes shouldForwardProp on composed styled components', () => {
      const StyledView = styled.View.withConfig({
        shouldForwardProp: prop => prop === 'passThru',
      })<{ filterThis?: boolean; passThru?: boolean }>`
        color: red;
      `;
      const ComposedView = styled(StyledView).withConfig({
        shouldForwardProp: () => true,
      })``;
      const wrapper = TestRenderer.create(<ComposedView filterThis passThru />);
      const { props } = wrapper.root.findByType(View);
      expect(props.passThru).toBeDefined();
      expect(props.filterThis).toBeUndefined();
    });

    it('shouldForwardProp argument signature', () => {
      const stub = jest.fn(() => true);
      const StyledView = styled.View.withConfig({
        shouldForwardProp: stub,
      })<{ something: boolean }>`
        color: red;
      `;

      TestRenderer.create(<StyledView something />);

      expect(stub.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "something",
            [Function],
          ],
        ]
      `);

      // element being created
      // @ts-expect-error bad types
      expect(stub.mock.calls[0][1]).toEqual(View);
    });

    it('should filter out props when using "as" to a custom component', () => {
      const AsComp = (props: PropsWithChildren<{}>) => <View {...props} />;
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);

      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('can set computed styles based on props that are being filtered out', () => {
      const AsComp = (props: PropsWithChildren<{}>) => <View {...props} />;
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: ${props => (props.filterThis === 'abc' ? 'red' : undefined)};
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);

      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('should filter our props when using "as" to a different element', () => {
      const Comp = styled.View.withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as={Text} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(Text);

      expect(props.style).toEqual({ color: 'red' });
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });
  });
});
