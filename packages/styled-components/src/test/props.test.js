// @flow
import React, { Fragment } from 'react';
import TestRenderer from 'react-test-renderer';
import { getRenderedCSS, resetStyled } from './utils';

let styled;

describe('props', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should execute interpolations and fall back', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `;
    TestRenderer.create(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: black;
      }"
    `);
  });

  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `;
    TestRenderer.create(<Comp fg="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        color: red;
      }"
    `);
  });

  it('should ignore non-0 falsy object interpolations', () => {
    const Comp = styled.div`
      ${() => ({
        borderWidth: 0,
        colorA: null,
        colorB: false,
        colorC: undefined,
        colorD: '',
      })};
    `;
    TestRenderer.create(<Comp fg="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        border-width: 0;
      }"
    `);
  });

  it('should filter out props prefixed with dollar sign (transient props)', () => {
    const Comp = styled(p => <div {...p} />)`
      color: ${props => props.$fg || 'black'};
    `;
    expect(
      TestRenderer.create(
        <>
          <Comp $fg="red" />
          <Comp fg="red" />
        </>
      ).toJSON()
    ).toMatchInlineSnapshot(`
      Array [
        <div
          className="sc-a b"
        />,
        <div
          className="sc-a c"
          fg="red"
        />,
      ]
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

  it('"$as" should take precedence over "as"', () => {
    const Comp = styled.div`
      color: ${props => props.$fg || 'black'};
    `;
    expect(TestRenderer.create(<Comp $as="button" as="span" />).toJSON()).toMatchInlineSnapshot(`
        <button
          className="sc-a b"
        />
    `);
  });

  it('should forward the "as" prop if "forwardedAs" is used', () => {
    const Comp = ({ as: Component = 'div', ...props }) => <Component {...props} />;

    const Comp2 = styled(Comp)`
      background: red;
    `;

    expect(TestRenderer.create(<Comp2 forwardedAs="button" />).toJSON()).toMatchInlineSnapshot(`
      <button
        className="sc-a b"
      />
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
      })`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType('div');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('allows custom prop filtering for components', () => {
      const InnerComp = props => <div {...props} />;
      const Comp = styled(InnerComp).withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType('div');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('composes shouldForwardProp on composed styled components', () => {
      const StyledDiv = styled('div').withConfig({
        shouldForwardProp: prop => prop === 'passThru',
      })`
        color: red;
      `;
      const ComposedDiv = styled(StyledDiv).withConfig({
        shouldForwardProp: () => true,
      })``;
      const wrapper = TestRenderer.create(<ComposedDiv filterThis passThru />);
      const { props } = wrapper.root.findByType('div');
      expect(props.passThru).toBeDefined();
      expect(props.filterThis).toBeUndefined();
    });

    it('should inherit shouldForwardProp for wrapped styled components', () => {
      const Div1 = styled('div').withConfig({
        shouldForwardProp: prop => prop !== 'color',
      })`
        background-color: ${({ color }) => color};
      `;
      const Div2 = styled(Div1)``;
      const wrapper = TestRenderer.create(
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
      expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should filter out props when using "as" to a custom component', () => {
      const AsComp = props => <div {...props} />;
      const Comp = styled('div').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('can set computed styles based on props that are being filtered out', () => {
      const AsComp = props => <div {...props} />;
      const Comp = styled('div').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })`
        color: ${props => (props.filterThis === 'abc' ? 'red' : undefined)};
      `;
      const wrapper = TestRenderer.create(<Comp as={AsComp} filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType(AsComp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('should filter our props when using "as" to a different element', () => {
      const Comp = styled('div').withConfig({
        shouldForwardProp: prop => !['filterThis'].includes(prop),
      })`
        color: red;
      `;
      const wrapper = TestRenderer.create(<Comp as="a" filterThis="abc" passThru="def" />);
      const { props } = wrapper.root.findByType('a');
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
      expect(props.passThru).toBe('def');
      expect(props.filterThis).toBeUndefined();
    });

    it('passes the default prop filtering function for use if desired', () => {
      const stub = jest.fn();

      const Comp = styled('div').withConfig({
        shouldForwardProp: stub,
      })`
        color: red;
      `;

      TestRenderer.create(<Comp as="a" filterThis="abc" passThru="def" />);

      expect(stub.mock.calls[0]).toEqual(['filterThis', expect.any(Function)]);
      expect(stub.mock.calls[0][1]('filterThis')).toBe(false);
      expect(stub.mock.calls[0][1]('id')).toBe(true);
    });
  });
});
