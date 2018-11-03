// @flow
import 'react-native';
import { Text, View } from 'react-native';
import React from 'react';
import TestRenderer from 'react-test-renderer';

import styled from '../index';

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

    it('merges attrs when inheriting SC', () => {
      const Parent = styled.View.attrs({
        first: 'first',
      })``;

      const Child = styled(Parent).attrs({
        second: 'second',
      })``;

      const wrapper = TestRenderer.create(<Child />);
      const view = wrapper.root.findByType('View');

      expect(view.props).toMatchObject({
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

    it('should override children of course', () => {
      const Comp = styled.Text.attrs({
        children: <Text>Amazing</Text>,
      })``;

      const wrapper = TestRenderer.create(<Comp>Something else</Comp>);
      const text = wrapper.root.findByType('Text');

      expect(text.props).toMatchObject({
        children: 'Something else',
        style: [{}],
      });
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

      expect(console.warn.mock.calls[0][0]).toMatchInlineSnapshot(`
"It looks like you've used a component as value for the component prop in the attrs constructor.
You'll need to wrap it in a function to make it available inside the styled component.
For example, { component: () => InnerComponent } instead of { component: InnerComponent }"
`);
    });

    it('does not warn if the Stateless Functional Component is wrapped in a function', () => {
      const Inner = () => <Text />;
      const Comp = styled.Text.attrs({ component: () => Inner })``;

      TestRenderer.create(<Comp />);

      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
