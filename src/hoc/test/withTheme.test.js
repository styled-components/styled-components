import React from 'react';
import TestRenderer from 'react-test-renderer';

import ThemeProvider from '../../models/ThemeProvider';
import withTheme from '../withTheme';

describe('withTheme', () => {
  it('should not throw an error when defaultProps is defined', () => {
    const Component = () => <div>Wrapped Component</div>;
    Component.defaultProps = {
      theme: {},
    };

    const WrappedComponent = withTheme(Component);
    TestRenderer.create(<WrappedComponent />);
  });

  it('should not throw an error when defaultProps is not defined', () => {
    expect(() => {
      const Component = () => <div>Wrapped Component</div>;
      const WrappedComponent = withTheme(Component);
      TestRenderer.create(<WrappedComponent />);
    }).not.toThrow();
  });

  it('should throw a warning when no default theme is provided', () => {
    const spy = jest.spyOn(global.console, 'warn');
    const Component = () => <div>Wrapped Component</div>;
    const WrappedComponent = withTheme(Component);
    TestRenderer.create(<WrappedComponent />);
    expect(spy).toHaveBeenCalled();
  });
});
