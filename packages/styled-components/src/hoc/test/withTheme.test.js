import React from 'react';
import TestRenderer from 'react-test-renderer';

import ThemeProvider from '../../models/ThemeProvider';
import withTheme from '../withTheme';

describe('withTheme', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));

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
    const Comp = () => <div>Wrapped Component</div>;
    const WrappedComponent = withTheme(Comp);
    TestRenderer.create(<WrappedComponent />);
    expect(console.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class \\"Comp\\""`
    );
  });
});
