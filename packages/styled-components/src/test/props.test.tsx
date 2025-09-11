import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React, { Fragment } from 'react';
import { getRenderedCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

describe('props', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should execute interpolations and fall back', () => {
    const Comp = styled.div<{ fg?: string }>`
      color: ${props => props.fg || 'black'};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: black;
      }"
    `);
  });

  it('should execute interpolations and inject props', () => {
    const Comp = styled.div<{ fg: string }>`
      color: ${props => props.fg || 'black'};
    `;
    render(<Comp fg="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: red;
      }"
    `);
  });

  it('should ignore non-0 falsy object interpolations', () => {
    const Comp = styled.div<{ fg: string }>`
      ${
        // @ts-expect-error improper input
        () => ({
          borderWidth: 0,
          colorA: null,
          colorB: false,
          colorC: undefined,
          colorD: '',
        })
      };
    `;
    render(<Comp fg="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        border-width: 0;
      }"
    `);
  });

  it('should filter out props prefixed with dollar sign (transient props)', () => {
    const Comp = styled((p: any) => <div {...p} />)<{ $fg?: string; fg?: string }>`
      color: ${props => props.$fg || 'black'};
    `;
    expect(
      render(
        <>
          <Comp $fg="red" />
          <Comp fg="red" />
        </>
      ).asFragment()
    ).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a b"
        />
        <div
          class="sc-a c"
          fg="red"
        />
      </DocumentFragment>
    `);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: red;
      }
      .c {
        color: black;
      }"
    `);
  });

  it('should forward the "as" prop if "forwardedAs" is used', () => {
    const Comp = ({ as: Component = 'div', ...props }) => <Component {...props} />;

    const Comp2 = styled(Comp)`
      background: red;
    `;

    expect(render(<Comp2 forwardedAs="button" />).asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <button
          class="sc-a b"
        />
      </DocumentFragment>
    `);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        background: red;
      }"
    `);
  });

  describe('shouldForwardProp', () => {
    // NB existing functionality (when `shouldForwardProp` is not set) is tested elsewhere

    it('allows for custom prop filtering for elements', () => {
      const Comp = styled('div').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = render(<Comp data-testid="subject" filterThis="abc" passThru="def" />);
      const el = wrapper.getByTestId('subject');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(el).toHaveAttribute('passThru', 'def');
      expect(el).not.toHaveAttribute('filterThis');
    });

    it('allows custom prop filtering for components', () => {
      const InnerComp = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;
      const Comp = styled(InnerComp).withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = render(<Comp data-testid="subject" filterThis="abc" passThru="def" />);
      const el = wrapper.getByTestId('subject');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(el).toHaveAttribute('passThru', 'def');
      expect(el).not.toHaveAttribute('filterThis');
    });

    it('composes shouldForwardProp on composed styled components', () => {
      const StyledDiv = styled('div').withConfig({
        shouldForwardProp: prop => prop === 'passThru' || prop === 'data-testid',
      })<{ filterThis: boolean; passThru: boolean }>`
        color: red;
      `;
      const ComposedDiv = styled(StyledDiv).withConfig({
        shouldForwardProp: () => true,
      })``;
      const wrapper = render(<ComposedDiv data-testid="subject" filterThis passThru="true" />);
      const el = wrapper.getByTestId('subject');
      expect(el).toHaveAttribute('passThru');
      expect(el).not.toHaveAttribute('filterThis');
    });

    it('should inherit shouldForwardProp for wrapped styled components', () => {
      const Div1 = styled('div').withConfig({
        shouldForwardProp: prop => prop !== 'color',
      })<{ color: string }>`
        background-color: ${({ color }) => color};
      `;
      const Div2 = styled(Div1)``;
      const wrapper = render(
        <Fragment>
          <Div1 color="red" id="test-1" />
          <Div2 color="green" id="test-2" />
        </Fragment>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          background-color: red;
        }
        .d {
          background-color: green;
        }"
      `);
      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should filter out props when using "as" to a custom component', () => {
      const AsComp = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;
      const Comp = styled('div').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = render(
        <Comp as={AsComp} data-testid="subject" filterThis="abc" passThru="def" />
      );
      const el = wrapper.getByTestId('subject');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(el).toHaveAttribute('passThru', 'def');
      expect(el).not.toHaveAttribute('filterThis');
    });

    it('can set computed styles based on props that are being filtered out', () => {
      const AsComp = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;
      const Comp = styled('div').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: ${props => (props.filterThis === 'abc' ? 'red' : undefined)};
      `;
      const wrapper = render(
        <Comp as={AsComp} data-testid="subject" filterThis="abc" passThru="def" />
      );
      const el = wrapper.getByTestId('subject');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(el).toHaveAttribute('passThru', 'def');
      expect(el).not.toHaveAttribute('filterThis');
    });

    it('should filter our props when using "as" to a different element', () => {
      const Comp = styled('div').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;
      const wrapper = render(<Comp as="a" data-testid="subject" filterThis="abc" passThru="def" />);
      const el = wrapper.getByTestId('subject');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(el).toHaveAttribute('passThru', 'def');
      expect(el).not.toHaveAttribute('filterThis');
    });

    it('passes the target element for use if desired', () => {
      const stub = jest.fn();

      const Comp = styled('div').withConfig({
        shouldForwardProp: stub,
      })<{ filterThis: string; passThru: string }>`
        color: red;
      `;

      render(<Comp as="a" href="/foo" filterThis="abc" passThru="def" />);

      expect(stub).toHaveBeenCalledWith('filterThis', 'a');
      expect(stub).toHaveBeenCalledWith('href', 'a');
    });

    it('warns in development mode when shouldForwardProp is not provided for an unknown prop', () => {
      let originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const Comp = styled('div')<{ filterThis: string }>`
        color: red;
      `;

      render(<Comp as="a" href="/foo" filterThis="abc" />);

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('filterThis'));
      process.env.NODE_ENV = originalEnv;
    });

    it('do not warn in development mode when shouldForwardProp is not provided for an unknown prop on React component', () => {
      let originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const Comp = styled(({ className, myLabel }: { className?: string; myLabel: string }) => (
        <span className={className}>{myLabel}</span>
      ))`
        color: red;
      `;

      render(<Comp myLabel="My label" />);

      expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('myLabel'));
      expect(console.warn).toHaveBeenCalledTimes(0);
      process.env.NODE_ENV = originalEnv;
    });
  });
});
