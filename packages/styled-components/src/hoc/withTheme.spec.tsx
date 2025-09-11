import { render } from '@testing-library/react';
import React from 'react';
import ThemeProvider from '../models/ThemeProvider';
import { ExecutionContext } from '../types';
import withTheme from './withTheme';

describe('withTheme', () => {
  let warn: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should not throw an error when defaultProps is defined', () => {
    const Component = () => <div>Wrapped Component</div>;
    Component.defaultProps = {
      theme: {},
    };

    const WrappedComponent = withTheme(Component);
    render(<WrappedComponent />);
  });

  it('should not throw an error when defaultProps is not defined', () => {
    expect(() => {
      const Component = () => <div>Wrapped Component</div>;
      const WrappedComponent = withTheme(Component);
      render(<WrappedComponent />);
    }).not.toThrow();
  });

  it('should throw a warning when no default theme is provided', () => {
    const Comp = () => <div>Wrapped Component</div>;
    const WrappedComponent = withTheme(Comp);
    render(<WrappedComponent />);
    expect(warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"[withTheme] You are not using a ThemeProvider nor passing a theme prop or a theme in defaultProps in component class "Comp""`
    );
  });

  it('should provide the theme to the wrapped component', () => {
    const WrappedComponent = withTheme((p: ExecutionContext) => {
      return <span>{JSON.stringify(p.theme)}</span>;
    });

    const wrapper = render(
      <ThemeProvider theme={{ color: 'red' }}>
        <WrappedComponent />
      </ThemeProvider>
    );
    expect(wrapper.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <span>
          {"color":"red"}
        </span>
      </DocumentFragment>
    `);
  });
});
