import { render } from '@testing-library/react';
import React from 'react';
import rscPlugin from '../../plugins/rsc';
import rtlPlugin from '../../plugins/rtl';
import Keyframes from '../../models/Keyframes';
import { NodeKind } from '../../parser/ast';
import { mainCompiler, StyleSheetManager } from '../../models/StyleSheetManager';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import type { ExecutionContext } from '../../types';
import createCompiler from '../../utils/compiler';
import { resetWarnOnce } from '../../utils/warnOnce';
import css from '../css';
import keyframes from '../keyframes';

// Disable isStaticRules optimization since we're not
// testing for WebStyle specifics here
jest.mock('../../utils/isStaticRules', () => () => false);

let styled: ReturnType<typeof resetStyled>;

describe('keyframes', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should return Keyframes instance', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `).toBeInstanceOf(Keyframes);
  });

  it('should return its name via .getName()', () => {
    expect(
      keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `.getName()
    ).toMatchInlineSnapshot(`"a"`);
  });

  it('should insert the correct styles', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `;
    render(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .c {
        animation: a 2s linear infinite;
      }"
    `);
  });

  it('should insert the correct styles for objects', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div({
      animation: css`
        ${animation} 2s linear infinite
      `,
    });

    render(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .c {
        animation: a 2s linear infinite;
      }"
    `);
  });

  it('should insert the correct styles for objects with nesting', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div({
      '@media(max-width: 700px)': {
        animation: css`
          ${animation} 2s linear infinite
        `,
        '&:hover': {
          animation: css`
            ${animation} 10s linear infinite
          `,
        },
      },
    });

    render(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      @media (max-width:700px) {
        .c {
          animation: a 2s linear infinite;
        }
        .c:hover {
          animation: a 10s linear infinite;
        }
      }"
    `);
  });

  it('should insert the correct styles when keyframes in props', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div<{ $animation: any }>`
      animation: ${props => props.$animation} 2s linear infinite;
    `;
    render(<Comp $animation={animation} />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .c {
        animation: a 2s linear infinite;
      }"
    `);
  });

  it('should handle interpolations', () => {
    const opacity = ['opacity: 0;', 'opacity: 1;'];

    const opacityAnimation = keyframes`
      from {
        ${opacity[0]}
      }
      to {
        ${opacity[1]}
      }
    `;

    const slideAnimation = keyframes`
      from {
        transform: translateX(-10px);
      }
      to {
        transform: none;
      }
    `;

    const getAnimation = (animation: any): any => {
      if (Array.isArray(animation)) {
        return animation.reduce(
          (ret, a, index) => css`
            ${ret}${index > 0 ? ',' : ''} ${getAnimation(a)}
          `,
          ''
        );
      } else {
        return css`
          ${animation === 'slide' ? slideAnimation : opacityAnimation} 1s linear
        `;
      }
    };

    const Foo = styled.div<{ animation?: any }>`
      animation: ${props => (props.animation ? getAnimation(props.animation) : 'none')};
    `;

    const App = () => (
      <React.Fragment>
        <Foo>hi</Foo>
        <Foo animation={['slide', 'fade']}>hi, I slide and fade.</Foo>
        <Foo animation="fade">hi I fade</Foo>
        <Foo animation="slide">hi I slide</Foo>
      </React.Fragment>
    );

    render(<App />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes b {
        from {
          transform: translateX(-10px);
        }
        to {
          transform: none;
        }
      }
      .d {
        animation: none;
      }
      .e {
        animation: b 1s linear,
          a 1s linear;
      }
      .f {
        animation: a 1s linear;
      }
      .g {
        animation: b 1s linear;
      }"
    `);
  });

  it('writes a function interpolation as its source text, with a dev warning naming the keyframes', () => {
    resetWarnOnce();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const opacity = () => 0;
    const fade = keyframes`from { opacity: ${opacity}; }`;
    expect(fade.rules).toBe(`from { opacity: ${String(opacity)}; }`);
    expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
      expect.stringContaining('`keyframes` `' + fade.name + '`'),
    ]);
    warn.mockRestore();
  });

  it('writes a styled component interpolated into keyframes as its class selector, without a warning', () => {
    resetWarnOnce();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Box = styled.div``;
    const fade = keyframes`from { opacity: 0; } /* ${Box} */`;
    expect(fade.rules).toBe(`from { opacity: 0; } /* ${String(Box)} */`);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should throw an error when interpolated in a vanilla string', () => {
    const animation = keyframes``;

    expect(() => `animation-name: ${animation};`).toThrow();
  });

  it('should apply StyleSheetManager plugins to injected keyframes', () => {
    const rules = `
      0% {
        left: 0%;
      }
      100% {
        left: 100%;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `;
    render(
      <StyleSheetManager plugins={[rscPlugin]}>
        <Comp />
      </StyleSheetManager>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes aAxDRB {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      .c {
        animation: aAxDRB 2s linear infinite;
      }"
    `);
  });

  it('should reinject if used in different StyleSheetManager plugin contexts', () => {
    const rules = `
      0% {
        left: 0%;
      }
      100% {
        left: 100%;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `;
    render(
      <>
        <Comp />
        <StyleSheetManager plugins={[rscPlugin]}>
          <Comp />
        </StyleSheetManager>
      </>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      @keyframes aAxDRB {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      .c {
        animation: a 2s linear infinite;
      }
      .d {
        animation: aAxDRB 2s linear infinite;
      }"
    `);
  });
  it('compiles a referenced keyframes value once across renders', () => {
    const fade = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;
    const Comp = styled.div<{ $ms: number }>`
      animation: ${fade} ${p => p.$ms}ms linear;
    `;
    const emitSpy = jest.spyOn(mainCompiler, 'emit');

    const { rerender } = render(<Comp $ms={100} />);
    rerender(<Comp $ms={200} />);
    rerender(<Comp $ms={300} />);

    const keyframesEmits = emitSpy.mock.calls.filter(
      call => call[0].ast.length === 1 && call[0].ast[0].kind === NodeKind.Keyframes
    );
    expect(keyframesEmits).toHaveLength(1);
    expect(getRenderedCSS()).toContain('@keyframes ' + fade.getName());
    emitSpy.mockRestore();
  });

  /**
   * A `keyframes` template is a frame list read with the same roles and value
   * checks as a frame list inside `@keyframes`, so no value can close the
   * `@keyframes` block.
   */
  describe('values in a keyframes template', () => {
    const injection = '0; } } body { color: red } @keyframes x { from { a: b';

    let warn: jest.SpyInstance;
    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warn.mockRestore();
    });

    const compiled = (kf: Keyframes) => kf.compile().rules;

    it('drops a declaration whose value would close its frame and the @keyframes block, with a dev warning', () => {
      const kf = keyframes`from { opacity: ${injection}; color: blue; }`;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{from{color:blue;}}']);
      expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
        expect.stringContaining('`opacity`'),
      ]);
    });

    it('adds no frame or rule through a declaration value when rendered', () => {
      const kf = keyframes`from { opacity: ${injection}; }`;
      const Comp = styled.div`
        animation: ${kf} 1s;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes a {}
        .c {
          animation: a 1s;
        }"
      `);
    });

    it('writes a value in a stop', () => {
      const kf = keyframes`${50}% { opacity: 0.5; }`;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{50%{opacity:0.5;}}']);
    });

    it('drops a frame whose stop value would close a frame', () => {
      const kf = keyframes`${'to { color: red } body'}, from { opacity: 0; } to { opacity: 1; }`;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{to{opacity:1;}}']);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('reads a stop list from a value standing before a frame block', () => {
      const kf = keyframes`${'from, 50%'} { opacity: 0; }`;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{from,50%{opacity:0;}}']);
    });

    it('splits a declaration value at a `;` into declarations of the same frame', () => {
      const kf = keyframes`from { opacity: ${'0; color: red'}; }`;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{from{opacity:0;color:red;}}']);
    });

    it('writes a number as its decimal text', () => {
      const kf = keyframes`from { opacity: ${0}; } to { opacity: ${0.5}; }`;
      expect(compiled(kf)).toEqual([
        '@keyframes ' + kf.name + '{from{opacity:0;}to{opacity:0.5;}}',
      ]);
    });

    it('splices the declarations of a css fragment inside a frame', () => {
      const kf = keyframes`from { ${css`
        opacity: ${0};
        color: ${'red'};
      `} }`;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{from{opacity:0;color:red;}}']);
    });

    it('splices the frames of a css fragment in the frame list', () => {
      const kf = keyframes`
        ${css`
          from { opacity: ${0}; }
        `}
        to { opacity: 1; }
      `;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{from{opacity:0;}to{opacity:1;}}']);
    });

    it('writes a function inside a css fragment as its source text, without calling it', () => {
      // Throws when called without a render context.
      const opacity = (p: ExecutionContext) => p.theme;
      const kf = keyframes`from { ${css`opacity: ${opacity};`} }`;
      expect(compiled(kf)).toEqual([
        '@keyframes ' + kf.name + '{from{opacity:' + String(opacity) + ';}}',
      ]);
      expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
        expect.stringContaining('`keyframes` `' + kf.name + '`'),
      ]);
    });

    it('drops a declaration whose function source text holds a brace, with a dev warning', () => {
      function opacity() {
        return 0;
      }
      const kf = keyframes`from { opacity: ${opacity}; color: blue; }`;
      expect(compiled(kf)).toEqual(['@keyframes ' + kf.name + '{from{color:blue;}}']);
      expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
        expect.stringContaining('`keyframes` `' + kf.name + '`'),
        expect.stringContaining('`opacity`'),
      ]);
    });

    it('writes a function as its source text in the compiled frames', () => {
      const opacity = () => 0;
      const kf = keyframes`from { opacity: ${opacity}; }`;
      expect(compiled(kf)).toEqual([
        '@keyframes ' + kf.name + '{from{opacity:' + String(opacity) + ';}}',
      ]);
    });

    it('writes a keyframes value as its name and injects it with the keyframes holding it', () => {
      const inner = keyframes`from { opacity: 0; }`;
      const outer = keyframes`from { animation-name: ${inner}; }`;
      expect(compiled(outer)).toEqual([
        '@keyframes ' + outer.name + '{from{animation-name:' + inner.name + ';}}',
      ]);

      const Comp = styled.div`
        animation: ${outer} 1s;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes a {
          from {
            opacity: 0;
          }
        }
        @keyframes b {
          from {
            animation-name: a;
          }
        }
        .d {
          animation: b 1s;
        }"
      `);
    });

    it('names a keyframes value inside keyframes with the compiler of the keyframes holding it', () => {
      const inner = keyframes`from { opacity: 0; }`;
      const outer = keyframes`from { animation-name: ${inner}; }`;
      const Comp = styled.div`
        animation: ${outer} 1s;
      `;
      render(
        <StyleSheetManager plugins={[rscPlugin]}>
          <Comp />
        </StyleSheetManager>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes aAxDRB {
          from {
            opacity: 0;
          }
        }
        @keyframes bAxDRB {
          from {
            animation-name: aAxDRB;
          }
        }
        .d {
          animation: bAxDRB 1s;
        }"
      `);
    });
  });

  /**
   * A keyframes template holding no slot compiles to the same rules as the
   * string compile of its text, the path public `Compiler.compile` keeps.
   */
  describe('static keyframes templates', () => {
    const stops = ['from', 'to', '0%', '50%', '100%', 'from, to', '0%,100%'];
    const bodies = [
      'opacity: 0;',
      'opacity: 0; transform: translateX(10px);',
      'transform: rotate(0deg)',
      '/* note */ color: red;',
      '',
      'color: red; & a { color: blue; }',
      '--x: ;',
    ];
    const cases: string[] = [
      '',
      '   ',
      'from { opacity: 0; } } to { opacity: 1; }',
      'color: red; from { opacity: 0; }',
      '@media (min-width: 1px) { from { opacity: 0; } } to { opacity: 1; }',
      'from { opacity: 0 } to { opacity: 1 }',
      '/* from { opacity: 0 } */ to { opacity: 1; }',
      'from { background: url(data:image/svg+xml;utf8,<svg>{</svg>); }',
      'from { content: "}"; }',
    ];
    for (let i = 0; i < stops.length; i++) {
      for (let j = 0; j < bodies.length; j++) {
        const next = bodies[(j + 1) % bodies.length];
        cases.push(`\n  ${stops[i]} {\n    ${bodies[j]}\n  }\n  to { ${next} }\n`);
      }
    }

    const template = (text: string) => Object.assign([text], { raw: [text] });

    it.each(cases)('compiles %j as its string compile does', text => {
      const kf = keyframes(template(text));
      expect(kf.compile().rules).toEqual(mainCompiler.compile(text, kf.name, '@keyframes'));
    });

    it('applies the declaration plugins of its compiler, and no namespace', () => {
      const text = 'from { margin-left: 0; } to { margin-left: 10px; }';
      const kf = keyframes(template(text));
      const compiler = createCompiler({
        options: { namespace: '.ns' },
        plugins: [rtlPlugin, rscPlugin],
      });
      expect(kf.compile(compiler).rules).toEqual([
        '@keyframes ' + kf.getName(compiler) + '{from{margin-right:0;}to{margin-right:10px;}}',
      ]);
      expect(kf.compile(compiler).rules).toEqual(
        compiler.compile(text, kf.getName(compiler), '@keyframes')
      );
    });
  });

  it('namespaced StyleSheetManager works with animations', () => {
    const rotate = keyframes`
    0% {
      transform: rotate(0deg)
    }
    100% {
      transform: rotate(360deg)
    }
  `;

    const TestAnim = styled.div`
      color: blue;
      animation: ${rotate} 0.75s infinite linear;
    `;

    render(
      <StyleSheetManager namespace=".animparent">
        <div>
          <TestAnim>Foo</TestAnim>
        </div>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });
});
