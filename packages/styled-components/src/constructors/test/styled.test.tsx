import { render } from '@testing-library/react';
import React, { ComponentProps } from 'react';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import { elements } from '../../utils/domElements';

let styled: ReturnType<typeof resetStyled>;

describe('styled', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should have all valid HTML5 elements defined as properties', () => {
    elements.forEach(element => {
      expect(styled[element]).toBeTruthy();
    });
  });

  it('renders a shorthand as its tag', () => {
    const Box = styled.section`
      color: red;
    `;

    const { container } = render(<Box />);

    expect(container.firstElementChild?.tagName).toBe('SECTION');
  });

  it('returns the same factory for repeated access to a shorthand', () => {
    expect(styled.div).toBe(styled.div);
  });

  it('leaves probe property reads undefined so serializers and thenables are not answered', () => {
    // `then` is lowercase so it needs an explicit exclusion; camelCase probes
    // (`toJSON`, `displayName`, `asymmetricMatch`) fail the tag-shape test.
    const readProperty = (target: object, key: PropertyKey): unknown => Reflect.get(target, key);

    for (const key of [
      '$$typeof',
      'then',
      '__esModule',
      'Fragment',
      '_owner',
      'DIV',
      'toJSON',
      'displayName',
      'asymmetricMatch',
      'nodeType',
    ]) {
      expect(readProperty(styled, key)).toBeUndefined();
      expect(key in styled).toBe(false);
    }

    expect(readProperty(styled, Symbol.iterator)).toBeUndefined();
  });

  it('reports tag shorthands as present so feature detection agrees with access', () => {
    expect('div' in styled).toBe(true);
    expect('feBlend' in styled).toBe(true);
    expect('clipPath' in styled).toBe(true);
    expect('then' in styled).toBe(false);
    expect('$$typeof' in styled).toBe(false);
    expect('toJSON' in styled).toBe(false);
  });

  it('keeps its own function properties readable through the shorthand trap', () => {
    expect(typeof styled.name).toBe('string');
    expect(typeof styled.call).toBe('function');
  });

  it('should expose the component static attribute like components', () => {
    const CollapseComponent = (props: ComponentProps<'div'>) => {
      return <div {...props} />;
    };

    const Panel = (props: ComponentProps<'div'>) => {
      return <div {...props} />;
    };

    const Collapse = Object.assign(CollapseComponent, { Panel, PI: '3.14' });

    const StyledCollapse = styled(Collapse)`
      background: red;
    `;

    expect(Collapse).toBeTruthy();
    expect(Collapse.Panel).toBeTruthy();
    expect(Collapse.PI).toBe('3.14');

    expect(StyledCollapse).toBeTruthy();
    expect(StyledCollapse.Panel).toBeTruthy();
    expect(StyledCollapse.PI).toBe('3.14');

    render(<StyledCollapse />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        background: red;
      }"
    `);
  });
});
