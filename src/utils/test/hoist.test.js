// @flow
/**
 * This is a modified version of the hoist-non-react-statics v3 testing suite.
 * BSD License: https://github.com/mridgway/hoist-non-react-statics/blob/master/LICENSE.md
 */
import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from '../hoist';

describe('hoist non react statics', () => {
  it('should hoist non react statics', () => {
    class Component extends React.Component {
      static displayName = 'Foo';
      static foo = 'bar';
      static propTypes = {
        on: PropTypes.bool.isRequired,
      };

      render() {
        return null;
      }
    }

    class Wrapper extends React.Component {
      static displayName = 'Bar';

      render() {
        return <Component />;
      }
    }

    hoistNonReactStatics(Wrapper, Component);

    expect(Wrapper.displayName).toEqual('Bar');
    expect(Wrapper.foo).toEqual('bar');
  });

  it('should not hoist custom statics', () => {
    class Component extends React.Component {
      static displayName = 'Foo';
      static foo = 'bar';

      render() {
        return null;
      }
    }

    class Wrapper extends React.Component {
      static displayName = 'Bar';

      render() {
        return <Component />;
      }
    }

    hoistNonReactStatics(Wrapper, Component, { foo: true });
    expect(Wrapper.foo).toBeUndefined();
  });

  it('should not hoist statics from strings', () => {
    const Component = 'input';

    class Wrapper extends React.Component {
      render() {
        return <Component />;
      }
    }

    hoistNonReactStatics(Wrapper, Component);
    expect(Wrapper[0]).toBeUndefined(); // if hoisting it would equal 'i'
  });

  it('should hoist symbols', () => {
    const foo = Symbol('foo');

    class Component extends React.Component {
      render() {
        return null;
      }
    }

    // Manually set static property using Symbol
    // since createReactClass doesn't handle symbols passed to static
    Component[foo] = 'bar';

    class Wrapper extends React.Component {
      render() {
        return <Component />;
      }
    }

    hoistNonReactStatics(Wrapper, Component);

    expect(Wrapper[foo]).toEqual('bar');
  });

  it('should hoist class statics', () => {
    class Component extends React.Component {
      static foo = 'bar';
      static test() {}
    }

    class Wrapper extends React.Component {
      render() {
        return <Component />;
      }
    }

    hoistNonReactStatics(Wrapper, Component);

    expect(Wrapper.foo).toEqual(Component.foo);
    expect(Wrapper.test).toEqual(Component.test);
  });

  it('should hoist properties with accessor methods', () => {
    class Component extends React.Component {
      render() {
        return null;
      }
    }

    // Manually set static complex property
    // since createReactClass doesn't handle properties passed to static
    let counter = 0;
    Object.defineProperty(Component, 'foo', {
      enumerable: true,
      configurable: true,
      get: () => counter++,
    });

    class Wrapper extends React.Component {
      render() {
        return <Component />;
      }
    }

    hoistNonReactStatics(Wrapper, Component);

    // Each access of Wrapper.foo should increment counter.
    expect(Wrapper.foo).toEqual(0);
    expect(Wrapper.foo).toEqual(1);
    expect(Wrapper.foo).toEqual(2);
  });

  it('should inherit static class properties', () => {
    class A extends React.Component {
      static test3 = 'A';
      static test4 = 'D';
      test5 = 'foo';
    }
    class B extends A {
      static test2 = 'B';
      static test4 = 'DD';
    }
    class C {
      static test1 = 'C';
    }
    const D = hoistNonReactStatics(C, B);

    expect(D.test1).toEqual('C');
    expect(D.test2).toEqual('B');
    expect(D.test3).toEqual('A');
    expect(D.test4).toEqual('DD');
    expect(D.test5).toEqual(undefined);
  });

  it('should inherit static class methods', () => {
    class A extends React.Component {
      static test3 = 'A';
      static test4 = 'D';
      static getMeta() {
        return {};
      }
      test5 = 'foo';
    }
    class B extends A {
      static test2 = 'B';
      static test4 = 'DD';
      static getMeta2() {
        return {};
      }
    }
    class C {
      static test1 = 'C';
    }
    const D = hoistNonReactStatics(C, B);

    expect(D.test1).toEqual('C');
    expect(D.test2).toEqual('B');
    expect(D.test3).toEqual('A');
    expect(D.test4).toEqual('DD');
    expect(D.test5).toEqual(undefined);
    expect(D.getMeta).toBeInstanceOf(Function);
    expect(D.getMeta2).toBeInstanceOf(Function);
    expect(D.getMeta()).toEqual({});
  });

  it('should not inherit ForwardRef render', () => {
    class FancyButton extends React.Component {}
    function logProps(Component) {
      class LogProps extends React.Component {
        static foo = 'foo';
        static render = 'bar';
        render() {
          const { forwardedRef, ...rest } = this.props;
          return <Component ref={forwardedRef} {...rest} foo="foo" bar="bar" />;
        }
      }
      const ForwardedComponent = React.forwardRef((props, ref) => (
        <LogProps {...props} forwardedRef={ref} />
      ));

      hoistNonReactStatics(ForwardedComponent, LogProps);

      return ForwardedComponent;
    }

    const WrappedFancyButton = logProps(FancyButton);

    expect(WrappedFancyButton.foo).toEqual('foo');
    expect(WrappedFancyButton.render).not.toEqual('bar');
  });
});
