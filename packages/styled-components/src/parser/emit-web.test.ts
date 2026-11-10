import type { EmitOptions } from './emit-web';
import { emitWeb, namespaceForm } from './emit-web';
import { parse, wrapAst } from './parser';
import { normalize } from '../utils/compiler';
import { resetWarnOnce } from '../utils/warnOnce';

function emit(css: string, selector = '.a'): string[] {
  return emitWeb(parse(normalize(css)), selector);
}

describe('web emitter', () => {
  it('emits simple declarations', () => {
    expect(emit(`color: red; background: blue;`)).toMatchInlineSnapshot(`
      [
        ".a{color:red;background:blue;}",
      ]
    `);
  });

  it('collapses non-contiguous base decls into one rule', () => {
    expect(emit(`color: red; &:hover { color: blue; } font-size: 16px;`)).toMatchInlineSnapshot(`
      [
        ".a{color:red;font-size:16px;}",
        ".a:hover{color:blue;}",
      ]
    `);
  });

  it('handles multiple nested rules inside @media', () => {
    expect(
      emit(`@media (min-width: 500px) { &:hover { a: 1; } &:focus { b: 2; } }`)
    ).toMatchInlineSnapshot(`
      [
        "@media (min-width: 500px){.a:hover{a:1;}.a:focus{b:2;}}",
      ]
    `);
  });

  it('handles @media with mixed base decl + nested rule', () => {
    expect(
      emit(`@media (min-width: 500px) { background: red; &:hover { color: blue; } }`)
    ).toMatchInlineSnapshot(`
      [
        "@media (min-width: 500px){.a{background:red;}.a:hover{color:blue;}}",
      ]
    `);
  });

  it('emits @keyframes preserving frame stops', () => {
    expect(
      emit(`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`)
    ).toMatchInlineSnapshot(`
      [
        "@keyframes spin{from{transform:rotate(0);}to{transform:rotate(360deg);}}",
      ]
    `);
  });

  it('prepends parent-space for bare (non-&) nested selectors', () => {
    expect(
      emit(`color: red; .foo { color: blue; } .bar .baz { padding: 8px; }`)
    ).toMatchInlineSnapshot(`
      [
        ".a{color:red;}",
        ".a .foo{color:blue;}",
        ".a .bar .baz{padding:8px;}",
      ]
    `);
  });

  it('joins comma-separated nested selectors', () => {
    expect(emit(`&:hover, &:focus { color: blue; }`)).toMatchInlineSnapshot(`
      [
        ".a:hover,.a:focus{color:blue;}",
      ]
    `);
  });

  it('nests at-rules (@media inside @supports)', () => {
    expect(
      emit(`@supports (display: grid) { @media (min-width: 500px) { &:hover { display: grid; } } }`)
    ).toMatchInlineSnapshot(`
      [
        "@supports (display: grid){@media (min-width: 500px){.a:hover{display:grid;}}}",
      ]
    `);
  });

  it('emits @font-face with bare declarations (no selector wrap)', () => {
    expect(emit(`@font-face { font-family: 'Foo'; src: url(foo.woff2); }`)).toMatchInlineSnapshot(`
      [
        "@font-face{font-family:'Foo';src:url(foo.woff2);}",
      ]
    `);
  });

  /**
   * CSS View Transitions 2 §8.3.1 (https://drafts.csswg.org/css-view-transitions-2/#view-transition-rule):
   * "@view-transition { <declaration-list> }" ... "The @view-transition rule accepts the navigation
   * and types descriptors." ... "the @view-transition rule can be nested inside a conditional group
   * rule such as @media or @supports."
   *
   * CSS Anchor Positioning 1 §6.4 (https://drafts.csswg.org/css-anchor-position-1/#fallback-rule):
   * "@position-try <dashed-ident> { <declaration-list> }" ... "The @position-try rule only accepts
   * the following accepted @position-try properties".
   *
   * Neither body holds a style rule, so it is emitted as written, never wrapped in the parent
   * selector, and kept when there is no parent selector (a global style).
   */
  describe('at-rules whose body is a declaration list', () => {
    test.each([
      ['a component', '.a'],
      ['a global style', ''],
    ])('emits @view-transition and @position-try as written in %s', (_, selector) => {
      expect(
        emit(
          `@view-transition { navigation: auto; types: slide forwards; }
           @position-try --below { top: anchor(bottom); position-area: bottom; }`,
          selector
        )
      ).toEqual([
        '@view-transition{navigation:auto;types:slide forwards;}',
        '@position-try --below{top:anchor(bottom);position-area:bottom;}',
      ]);
    });

    it('emits @view-transition nested in @media in a global style', () => {
      expect(
        emit(
          `@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto; } }`,
          ''
        )
      ).toEqual([
        '@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto;}}',
      ]);
    });

    /**
     * CSS Paged Media 3 §3 (https://drafts.csswg.org/css-page-3/#syntax-page-selector):
     * "@page = @page <page-selector-list>? { <declaration-rule-list> }" ...
     * "@top-left = @top-left { <declaration-list> };" ... "The @page rule can only contain page
     * properties and margin at-rules."
     *
     * CSS Fonts 4 (https://drafts.csswg.org/css-fonts-4/#font-feature-values):
     * "@font-feature-values = @font-feature-values <font-family-name># { <declaration-rule-list> }"
     * ... "@styleset = @styleset { <declaration-list> }" ... "The @font-feature-values block
     * accepts <declaration-rule-list> as its contents; these list items are either: at-rules named
     * by one of the <font-feature-value-type> at-keyword tokens or the font-display descriptor."
     */
    test.each([
      ['a component', '.a'],
      ['a global style', ''],
    ])(
      'keeps the declaration blocks nested in @page and @font-feature-values in %s',
      (_, selector) => {
        expect(
          emit(
            `@page :first { margin: 1cm; @top-left { content: "Title"; } }
           @font-feature-values Font One { font-display: swap; @styleset { nice-style: 12; } }`,
            selector
          )
        ).toEqual([
          '@page :first{margin:1cm;@top-left{content:"Title";}}',
          '@font-feature-values Font One{font-display:swap;@styleset{nice-style:12;}}',
        ]);
      }
    );
  });

  it('drops empty nested rules but keeps base decls', () => {
    expect(emit(`color: red; &:hover { } font-size: 16px;`)).toMatchInlineSnapshot(`
      [
        ".a{color:red;font-size:16px;}",
      ]
    `);
  });

  it('emits @import block-less', () => {
    expect(emit(`@import url(https://example.com/styles.css); color: red;`)).toMatchInlineSnapshot(`
      [
        ".a{color:red;}",
        "@import url(https://example.com/styles.css);",
      ]
    `);
  });

  it('preserves quoted content values', () => {
    expect(emit(`content: "}"; color: red;`)).toMatchInlineSnapshot(`
      [
        ".a{content:"}";color:red;}",
      ]
    `);
  });

  it('emits @container', () => {
    expect(
      emit(`@container card (min-width: 400px) { padding: 16px; &:hover { padding: 24px; } }`)
    ).toMatchInlineSnapshot(`
      [
        "@container card (min-width: 400px){.a{padding:16px;}.a:hover{padding:24px;}}",
      ]
    `);
  });

  it('emits @layer block-less (layer order declaration)', () => {
    expect(emit(`@layer reset, framework, utilities;`)).toMatchInlineSnapshot(`
      [
        "@layer reset,framework,utilities;",
      ]
    `);
  });

  it('emits @layer block', () => {
    expect(emit(`@layer utilities { color: red; }`)).toMatchInlineSnapshot(`
      [
        "@layer utilities{.a{color:red;}}",
      ]
    `);
  });

  // CSS Nesting: "A selector is said to contain the nesting selector if, when it was
  // parsed as any type of selector, a <delim-token> with the value "&" (U+0026
  // AMPERSAND) was encountered." An escaped `&` or one in a string is no delim-token.
  it.each([
    ['an escaped `&` beside a real one', '&.\\[\\&\\>\\*\\]', '.a.\\[\\&\\>\\*\\]'],
    ['an escaped `&` alone', '.\\[\\&\\>\\*\\]', '.a .\\[\\&\\>\\*\\]'],
    ['a double-quoted `&`', '&[b="&"]', '.a[b="&"]'],
    ['a single-quoted `&`', "&[b='&']", ".a[b='&']"],
    ['a `&` after an escaped quote in a string', '&[b="\\"&"]', '.a[b="\\"&"]'],
    ['a `&` in a string alone', '[b="&"]', '.a [b="&"]'],
    ['an escaped `&` inside a function', ':is(&,.\\&b)', ':is(.a,.\\&b)'],
    ['a real `&` after an escaped backslash', '.b\\\\&', '.b\\\\.a'],
  ])('replaces only the real `&` with %s', (_label, selector, resolved) => {
    expect(emit(`${selector} { c: d; }`)).toEqual([`${resolved}{c:d;}`]);
  });

  it('keeps a parent holding replacement patterns verbatim beside a string', () => {
    expect(emit('&[b="c"] { d: e; }', '.x$&y')).toEqual(['.x$&y[b="c"]{d:e;}']);
  });

  it('handles nested & + & self-reference (combinator spaces stripped)', () => {
    expect(emit(`& + & { margin-left: 8px; }`)).toMatchInlineSnapshot(`
      [
        ".a+.a{margin-left:8px;}",
      ]
    `);
  });

  it('rewrites & + & to a withConfig componentId verbatim, even one holding replacement patterns', () => {
    const root = parse(normalize(`& + & { margin-left: 8px; }`));
    expect(emitWeb(root, '.a', { componentId: 'x$&y', selfRefSelector: '.a' })).toEqual([
      '.x$&y+.x$&y{margin-left:8px;}',
    ]);
  });

  describe('container auto-name', () => {
    const options: EmitOptions = { componentId: 'sc-id' };

    it('names the container a root declaration makes', () => {
      expect(emitWeb(parse('container-type: size;'), '.a', options)).toEqual([
        '.a{container-type:size;container-name:sc-id;}',
      ]);
    });

    // Each of these writes to the component's own element, the one `${Component}` names.
    it.each([
      [
        '`&`',
        '& { container-type: size; }',
        ['.a{container-name:sc-id;}', '.a{container-type:size;}'],
      ],
      [
        '`&&`',
        '&& { container-type: size; }',
        ['.a{container-name:sc-id;}', '.a.a{container-type:size;}'],
      ],
      [
        '`&, &`',
        '&, & { container-type: size; }',
        ['.a{container-name:sc-id;}', '.a,.a{container-type:size;}'],
      ],
      [
        '`&` inside `&`',
        '& { & { container-type: size; } }',
        ['.a{container-name:sc-id;}', '.a{container-type:size;}'],
      ],
      [
        '`&` beside a root declaration',
        'color: red; & { container-type: size; }',
        ['.a{color:red;container-name:sc-id;}', '.a{container-type:size;}'],
      ],
      [
        '`&` beside another rule',
        '& { container-type: size; } h1 { top: 0; }',
        ['.a{container-name:sc-id;}', '.a{container-type:size;}', '.a h1{top:0;}'],
      ],
    ])('names the container a rule on %s makes', (_label, css, rules) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual(rules);
    });

    it.each([
      ['a pseudo-class', '&:hover { container-type: size; }', '.a:hover{container-type:size;}'],
      ['a descendant', '& .x { container-type: size; }', '.a .x{container-type:size;}'],
      ['`& &`', '& & { container-type: size; }', '.a .a{container-type:size;}'],
      [
        'a list with another element',
        '&, .x { container-type: size; }',
        '.a,.a .x{container-type:size;}',
      ],
      [
        'an at-rule',
        '@media print { & { container-type: size; } }',
        '@media print{.a{container-type:size;}}',
      ],
      [
        'an @font-face, whose declarations never reach the element',
        '@font-face { container-type: size; }',
        '@font-face{container-type:size;}',
      ],
      [
        'an @page, whose declarations never reach the element',
        '@page { container-type: size; }',
        '@page{container-type:size;}',
      ],
    ])('leaves a rule on %s unnamed', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual([expected]);
    });

    it.each([
      [
        'its own name on `&`',
        '& { container-type: size; container-name: x; }',
        ['.a{container-type:size;container-name:x;}'],
      ],
      [
        'a name on `&` beside a root type',
        'container-type: size; & { container-name: x; }',
        ['.a{container-type:size;}', '.a{container-name:x;}'],
      ],
      ['the normal type on `&`', '& { container-type: normal; }', ['.a{container-type:normal;}']],
    ])('adds no name for %s', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual(expected);
    });

    it.each([
      ['a nested rule', '.child { container-type: size; }', '.a .child{container-type:size;}'],
      [
        'a nested rule beside a sibling',
        '.child { container-type: size; } .other { top: 0; }',
        '.a .child{container-type:size;}',
      ],
    ])('leaves %s unnamed', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a', options)[0]).toBe(expected);
    });

    it('leaves a wrapped root unnamed', () => {
      expect(emitWeb(wrapAst(parse('container-type: size;'), '.a'), '', options)).toEqual([
        '.a{container-type:size;}',
      ]);
    });

    it.each([
      [
        'an explicit name',
        'container-type: size; container-name: x;',
        '.a{container-type:size;container-name:x;}',
      ],
      [
        'a name spelled like the normal type',
        'container-type: size; container-name: normal;',
        '.a{container-type:size;container-name:normal;}',
      ],
      ['the normal type', 'container-type: normal;', '.a{container-type:normal;}'],
    ])('adds nothing beside %s', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual([expected]);
    });

    /**
     * css-conditional-5 5.2:
     *   "The container-name property specifies a list of query container names. These names
     *   can be used by @container rules to filter which query containers are targeted."
     * and the grammar `none | <custom-ident>+`, so a list of ids is one valid value.
     */
    it('names the container with every id of an extension chain', () => {
      expect(
        emitWeb(parse('container-type: size;'), '.a', {
          componentId: 'sc-ext',
          ids: 'sc-base sc-ext',
        })
      ).toEqual(['.a{container-type:size;container-name:sc-base sc-ext;}']);
    });

    it('keeps an extension that sets no container type free of a name', () => {
      expect(
        emitWeb(parse('color: red;'), '.a', { componentId: 'sc-ext', ids: 'sc-base sc-ext' })
      ).toEqual(['.a{color:red;}']);
    });

    it('names the container with the component id when no chain is given', () => {
      expect(emitWeb(parse('container-type: size;'), '.a', options)).toEqual([
        '.a{container-type:size;container-name:sc-id;}',
      ]);
    });
  });

  /**
   * css-view-transitions-2 10.3:
   *   "The view-transition-class can be used to apply the same style rule to multiple named
   *   view transition pseudo-elements which may have a different view-transition-name."
   *   "Note that view-transition-class by itself doesn’t mark an element for capturing, it is
   *   only used as an additional way to style an element that already has a view-transition-name."
   *   "none is an invalid <custom-ident> for view-transition-class, even when combined with
   *   another <custom-ident>."
   * The class goes on the component's own element, so it follows a name set on that element in
   * any state or condition, and not one set on a descendant.
   */
  describe('view-transition-class auto-class', () => {
    const options: EmitOptions = { componentId: 'sc-id' };

    it.each([
      [
        'a root declaration',
        'view-transition-name: match-element;',
        ['.a{view-transition-name:match-element;view-transition-class:sc-id;}'],
      ],
      [
        'a root declaration beside others',
        'color: red; view-transition-name: card; top: 0;',
        ['.a{color:red;view-transition-name:card;top:0;view-transition-class:sc-id;}'],
      ],
      [
        'a state rule',
        '&[data-active] { view-transition-name: card; }',
        ['.a{view-transition-class:sc-id;}', '.a[data-active]{view-transition-name:card;}'],
      ],
      [
        'a name inside @media',
        '@media (min-width: 500px) { view-transition-name: card; }',
        [
          '.a{view-transition-class:sc-id;}',
          '@media (min-width: 500px){.a{view-transition-name:card;}}',
        ],
      ],
      [
        'a name inside @supports',
        '@supports (view-transition-name: card) { & { view-transition-name: card; } }',
        [
          '.a{view-transition-class:sc-id;}',
          '@supports (view-transition-name: card){.a{view-transition-name:card;}}',
        ],
      ],
      [
        'a name inside nested rules in @media',
        '@media print { &:hover { view-transition-name: card; } }',
        ['.a{view-transition-class:sc-id;}', '@media print{.a:hover{view-transition-name:card;}}'],
      ],
      [
        'a state rule with a list inside parens',
        '&:is(.x, .y) { view-transition-name: card; }',
        ['.a{view-transition-class:sc-id;}', '.a:is(.x, .y){view-transition-name:card;}'],
      ],
      [
        'a state rule with a space inside quotes',
        '&[aria-label="a b"] { view-transition-name: card; }',
        ['.a{view-transition-class:sc-id;}', '.a[aria-label="a b"]{view-transition-name:card;}'],
      ],
      [
        'a state rule with a combinator inside parens',
        '&:nth-child(2n + 1) { view-transition-name: card; }',
        ['.a{view-transition-class:sc-id;}', '.a:nth-child(2n + 1){view-transition-name:card;}'],
      ],
      [
        'a state rule with a leading combinator inside parens',
        '&:has(> li) { view-transition-name: card; }',
        ['.a{view-transition-class:sc-id;}', '.a:has(> li){view-transition-name:card;}'],
      ],
      [
        'a state rule with a combinator character inside brackets',
        '&[data-x="a>b"] { view-transition-name: card; }',
        ['.a{view-transition-class:sc-id;}', '.a[data-x="a>b"]{view-transition-name:card;}'],
      ],
      [
        'a state rule with a pseudo-element inside parens',
        '&:not(::before) { view-transition-name: card; }',
        ['.a{view-transition-class:sc-id;}', '.a:not(::before){view-transition-name:card;}'],
      ],
    ])('adds the class for %s', (_label, css, rules) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual(rules);
    });

    /**
     * A name on a pseudo-element gives the element the class too. Per the note quoted above, the
     * class by itself marks nothing for capture, so on an element with no name of its own it is
     * inert; both spellings of a pseudo-element agree.
     */
    it.each([
      ['&::before', '.a::before'],
      ['&:before', '.a:before'],
      ['&:hover::after', '.a:hover::after'],
    ])('adds an inert class for a name on the pseudo-element %s', (selector, emitted) => {
      expect(emitWeb(parse(`${selector} { view-transition-name: card; }`), '.a', options)).toEqual([
        '.a{view-transition-class:sc-id;}',
        `${emitted}{view-transition-name:card;}`,
      ]);
    });

    it.each([
      ['the none keyword', 'view-transition-name: none;', '.a{view-transition-name:none;}'],
      [
        'none in a state rule',
        '&:hover { view-transition-name: none; }',
        '.a:hover{view-transition-name:none;}',
      ],
      ['no name at all', 'color: red;', '.a{color:red;}'],
      [
        'a name on a descendant',
        '.child { view-transition-name: card; }',
        '.a .child{view-transition-name:card;}',
      ],
      [
        'a name on a child of a state',
        '&:hover > li { view-transition-name: card; }',
        '.a:hover>li{view-transition-name:card;}',
      ],
      ['a different property', 'view-transition-class: x;', '.a{view-transition-class:x;}'],
      [
        'a name on a descendant of a function selector',
        '&:is(.x, .y) > li { view-transition-name: card; }',
        '.a:is(.x, .y)>li{view-transition-name:card;}',
      ],
      [
        'a name on a descendant after a tab',
        '&\t.child { view-transition-name: card; }',
        '.a\t.child{view-transition-name:card;}',
      ],
      [
        'a name on a descendant after a newline',
        '&\n.child { view-transition-name: card; }',
        '.a\n.child{view-transition-name:card;}',
      ],
      [
        'a name on a child after a newline and a combinator',
        '&\n  > .child { view-transition-name: card; }',
        '.a>.child{view-transition-name:card;}',
      ],
      [
        'a name on a descendant past a quoted space',
        '&[aria-label="a b"] li { view-transition-name: card; }',
        '.a[aria-label="a b"] li{view-transition-name:card;}',
      ],
      [
        'a name inside @font-face, whose declarations never reach the element',
        '@font-face { view-transition-name: card; }',
        '@font-face{view-transition-name:card;}',
      ],
      [
        'a name inside @page, whose declarations never reach the element',
        '@page { view-transition-name: card; }',
        '@page{view-transition-name:card;}',
      ],
    ])('adds no class for %s', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual([expected]);
    });

    it.each([
      [
        'a root declaration',
        'view-transition-name: card; view-transition-class: mine;',
        ['.a{view-transition-name:card;view-transition-class:mine;}'],
      ],
      [
        '`&`',
        'view-transition-name: card; & { view-transition-class: mine; }',
        ['.a{view-transition-name:card;}', '.a{view-transition-class:mine;}'],
      ],
    ])('keeps an authored class on %s and adds none', (_label, css, rules) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual(rules);
    });

    // Recorded behavior: a class inside @media does not count as the element's own class, so
    // the automatic one is added at the root and the authored one wins by order only when the
    // media query matches.
    it('adds the class when the authored one sits inside @media', () => {
      expect(
        emitWeb(
          parse('view-transition-name: card; @media print { view-transition-class: mine; }'),
          '.a',
          options
        )
      ).toEqual([
        '.a{view-transition-name:card;view-transition-class:sc-id;}',
        '@media print{.a{view-transition-class:mine;}}',
      ]);
    });

    it('lists every id of an extension chain, base first', () => {
      expect(
        emitWeb(parse('view-transition-name: card;'), '.a', {
          componentId: 'sc-ext',
          ids: 'sc-base sc-ext',
        })
      ).toEqual(['.a{view-transition-name:card;view-transition-class:sc-base sc-ext;}']);
    });

    it('adds the class and the container name together', () => {
      expect(
        emitWeb(parse('view-transition-name: card; container-type: size;'), '.a', options)
      ).toEqual([
        '.a{view-transition-name:card;container-type:size;container-name:sc-id;view-transition-class:sc-id;}',
      ]);
    });

    it('adds nothing for a global style, which has no parent selector', () => {
      expect(
        emitWeb(parse('.card { view-transition-name: card; } html { container-type: size; }'), '', {
          componentId: 'sc-global-a',
        })
      ).toEqual(['.card{view-transition-name:card;}', 'html{container-type:size;}']);
    });

    // Past the composed-size limit a rule drops, and its declarations reach no element.
    it.each(['view-transition-name: card;', 'container-type: size;'])(
      'adds nothing for `%s` in a rule dropped at the size limit',
      declaration => {
        const parent = `.a ${'x'.repeat(60000)}`;
        const ast = parse(`${'&{top:0;}'.repeat(100)}&{${declaration}}`);
        resetWarnOnce();
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        expect(emitWeb(ast, parent, options)).toEqual(emitWeb(ast, parent));
      }
    );

    it('adds nothing for a keyframes block', () => {
      expect(
        emitWeb(
          parse('@keyframes spin { from { view-transition-name: card; } to { top: 0; } }'),
          '.a',
          options
        )
      ).toEqual(['@keyframes spin{from{view-transition-name:card;}to{top:0;}}']);
    });

    it('adds nothing when no component id is given', () => {
      expect(emitWeb(parse('view-transition-name: card;'), '.a')).toEqual([
        '.a{view-transition-name:card;}',
      ]);
    });
  });

  /*
   * CSS Box Alignment 3 (https://drafts.csswg.org/css-align-3/), quoted from the editor's draft.
   *
   * 5.1 The justify-content and align-content Properties
   *   "Applies to: block containers, multicol containers, flex containers, and grid containers"
   *
   * 5.1.1 Block Containers (Including Table Cells)
   *   "For table cells, the behavior of align-content: normal depends on the computed value of
   *   vertical-align: top makes it behave as start and bottom makes it behave as end; otherwise
   *   middle makes it behave as center, and all other values make it behave as baseline."
   *
   * CSS Flexible Box Layout 1 (https://drafts.csswg.org/css-flexbox-1/), quoted from the editor's
   * draft.
   *
   * 9.4 Cross Axis Alignment
   *   "In a single-line flex container, the cross size of the line is the cross size of the flex
   *   container, and align-content has no effect."
   *
   * The bridge writes `align-content` right after an authored `vertical-align` that sits on the
   * component's own element, in any state or condition of it, so the element places its content
   * as a table cell does. A pseudo-element, a descendant, a sibling, a mixed list, global styles,
   * keyframes and `compile()` have no such element and get none.
   */
  describe('align-content for vertical-align on the rn-web bridge', () => {
    const options: EmitOptions = { componentId: 'sc-id' };

    beforeEach(() => {
      globalThis.__NATIVE_WEB__ = true;
    });

    afterEach(() => {
      globalThis.__NATIVE_WEB__ = false;
    });

    it.each([
      [
        'a root declaration',
        'vertical-align: top;',
        ['.a{align-content:start;vertical-align:top;}'],
      ],
      [
        'a root declaration beside others',
        'color: red; vertical-align: middle; top: 0;',
        ['.a{align-content:center;color:red;vertical-align:middle;top:0;}'],
      ],
      ['`&`', '& { vertical-align: bottom; }', ['.a{align-content:end;vertical-align:bottom;}']],
      ['`&&`', '&& { vertical-align: top; }', ['.a.a{align-content:start;vertical-align:top;}']],
      [
        '`&` inside `&`',
        '& { & { vertical-align: top; } }',
        ['.a{align-content:start;vertical-align:top;}'],
      ],
      [
        '`&:hover`',
        '&:hover { vertical-align: middle; }',
        ['.a:hover{align-content:center;vertical-align:middle;}'],
      ],
      [
        '`&[data-x]`',
        '&[data-x] { vertical-align: top; }',
        ['.a[data-x]{align-content:start;vertical-align:top;}'],
      ],
      [
        'a list of the element in states',
        '&:hover, &:focus { vertical-align: top; }',
        ['.a:hover,.a:focus{align-content:start;vertical-align:top;}'],
      ],
      [
        'a root declaration in `@media`',
        '@media print { vertical-align: top; }',
        ['@media print{.a{align-content:start;vertical-align:top;}}'],
      ],
      [
        '`&` in `@media`',
        '@media print { & { vertical-align: bottom; } }',
        ['@media print{.a{align-content:end;vertical-align:bottom;}}'],
      ],
      [
        '`&:hover` in `@media`',
        '@media print { &:hover { vertical-align: top; } }',
        ['@media print{.a:hover{align-content:start;vertical-align:top;}}'],
      ],
      [
        'a priority',
        'vertical-align: top !important;',
        ['.a{align-content:start !important;vertical-align:top !important;}'],
      ],
    ])('adds align-content before the declarations on %s', (_label, css, rules) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual(rules);
    });

    it.each([
      [
        'before',
        'align-content: end; vertical-align: middle;',
        '.a{align-content:center;align-content:end;vertical-align:middle;}',
      ],
      [
        'after',
        'vertical-align: middle; align-content: end;',
        '.a{align-content:center;vertical-align:middle;align-content:end;}',
      ],
    ])('lets an authored align-content written %s vertical-align win', (_label, css, rule) => {
      expect(emitWeb(parse(css), '.a', options)).toEqual([rule]);
    });

    it('keeps the later vertical-align companion last among the companions', () => {
      expect(
        emitWeb(parse('vertical-align: top; color: red; vertical-align: bottom;'), '.a', options)
      ).toEqual([
        '.a{align-content:start;align-content:end;vertical-align:top;color:red;vertical-align:bottom;}',
      ]);
    });

    it.each([
      ['`&::before`', '&::before { vertical-align: top; }', '.a::before{vertical-align:top;}'],
      ['`&:before`', '&:before { vertical-align: top; }', '.a:before{vertical-align:top;}'],
      ['`&:after`', '&:after { vertical-align: top; }', '.a:after{vertical-align:top;}'],
      [
        '`&:first-line`',
        '&:first-line { vertical-align: top; }',
        '.a:first-line{vertical-align:top;}',
      ],
      [
        '`&:hover::before`',
        '&:hover::before { vertical-align: top; }',
        '.a:hover::before{vertical-align:top;}',
      ],
      [
        'a pseudo-element in a list with the element',
        '&, &::before { vertical-align: top; }',
        '.a,.a::before{vertical-align:top;}',
      ],
      [
        'a rule inside a pseudo-element rule',
        '&::before { &:hover { vertical-align: top; } }',
        '.a::before:hover{vertical-align:top;}',
      ],
      [
        '`&::before` in `@media`',
        '@media print { &::before { vertical-align: top; } }',
        '@media print{.a::before{vertical-align:top;}}',
      ],
      ['a descendant', '& .child { vertical-align: top; }', '.a .child{vertical-align:top;}'],
      ['a bare nested rule', '.child { vertical-align: top; }', '.a .child{vertical-align:top;}'],
      [
        'a state rule inside a descendant rule',
        '& .child { &:hover { vertical-align: top; } }',
        '.a .child:hover{vertical-align:top;}',
      ],
      ['a sibling', '& + & { vertical-align: top; }', '.a+.a{vertical-align:top;}'],
      [
        'a list with a descendant',
        '&, & .child { vertical-align: top; }',
        '.a,.a .child{vertical-align:top;}',
      ],
      [
        'a descendant in `@media`',
        '@media print { & .child { vertical-align: top; } }',
        '@media print{.a .child{vertical-align:top;}}',
      ],
      ['`@font-face`', '@font-face { vertical-align: top; }', '@font-face{vertical-align:top;}'],
      [
        'keyframes',
        '@keyframes spin { from { vertical-align: top; } }',
        '@keyframes spin{from{vertical-align:top;}}',
      ],
    ])('adds nothing for vertical-align on %s', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a', options)[0]).toBe(expected);
    });

    it('adds nothing without a parent selector, for global styles and a root `compile()` wrapped', () => {
      expect(emitWeb(parse('.x { vertical-align: top; }'), '', options)).toEqual([
        '.x{vertical-align:top;}',
      ]);
      expect(emitWeb(wrapAst(parse('vertical-align: top;'), '.a'), '', options)).toEqual([
        '.a{vertical-align:top;}',
      ]);
    });

    it('adds nothing when no component id is given', () => {
      expect(emitWeb(parse('vertical-align: top;'), '.a')).toEqual(['.a{vertical-align:top;}']);
    });

    it('adds nothing when the bridge flag is off', () => {
      globalThis.__NATIVE_WEB__ = false;

      expect(emitWeb(parse('vertical-align: top;'), '.a', options)).toEqual([
        '.a{vertical-align:top;}',
      ]);
    });

    it('passes the added declaration through the declaration plugin', () => {
      const decl: NonNullable<EmitOptions['decl']> = (prop, value) =>
        prop === 'align-content' ? { prop, value: value.toUpperCase() } : undefined;

      expect(emitWeb(parse('vertical-align: top;'), '.a', { ...options, decl })).toEqual([
        '.a{align-content:START;vertical-align:top;}',
      ]);
    });

    it('reads the authored vertical-align, not a plugin rewrite of it', () => {
      const decl: NonNullable<EmitOptions['decl']> = (prop, value) =>
        prop === 'vertical-align' ? { prop, value: 'baseline' } : undefined;

      expect(emitWeb(parse('vertical-align: top;'), '.a', { ...options, decl })).toEqual([
        '.a{align-content:start;vertical-align:baseline;}',
      ]);
    });

    it('adds nothing when the plugin drops the authored declaration', () => {
      resetWarnOnce();
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const decl: NonNullable<EmitOptions['decl']> = (prop, value) =>
        prop === 'vertical-align' ? { prop, value: value + '}' } : undefined;

      expect(
        emitWeb(parse('color: red; vertical-align: top;'), '.a', { ...options, decl })
      ).toEqual(['.a{color:red;}']);
    });
  });

  describe('dot removal in identifier lists', () => {
    // `${Component}` stringifies as a class selector (`.sc-abc`).
    it.each([
      ['one reference', 'view-transition-class: .sc-a;', '.a{view-transition-class:sc-a;}'],
      [
        'two references',
        'view-transition-class: .sc-a .sc-b;',
        '.a{view-transition-class:sc-a sc-b;}',
      ],
      [
        'a mix of dotted and plain names',
        'view-transition-class: .sc-a plain;',
        '.a{view-transition-class:sc-a plain;}',
      ],
      ['a container name', 'container-name: .sc-a;', '.a{container-name:sc-a;}'],
      ['two container names', 'container-name: .sc-a .sc-b;', '.a{container-name:sc-a sc-b;}'],
      [
        'a name in the container shorthand',
        'container: .sc-a / size;',
        '.a{container:sc-a / size;}',
      ],
      [
        'a name inside a rule',
        '&:hover { view-transition-class: .sc-a; }',
        '.a:hover{view-transition-class:sc-a;}',
      ],
      [
        'a name inside @media',
        '@media print { container-name: .sc-a; }',
        '@media print{.a{container-name:sc-a;}}',
      ],
      [
        'a name after a comma',
        'container-name: var(--n,.sc-a);',
        '.a{container-name:var(--n,sc-a);}',
      ],
      [
        'a name after an open paren',
        'view-transition-class: (.sc-a);',
        '.a{view-transition-class:(sc-a);}',
      ],
      ['a name after a slash', 'container: x/.sc-a;', '.a{container:x/sc-a;}'],
      [
        'a name after a quoted string',
        'container-name: ".x" .sc-a;',
        '.a{container-name:".x" sc-a;}',
      ],
    ])('drops the leading dot of %s', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a')).toEqual([expected]);
    });

    it.each([
      ['a string value', 'content: ".x";', '.a{content:".x";}'],
      ['a custom property', '--x: .a;', '.a{--x:.a;}'],
      ['a view-transition-name', 'view-transition-name: .sc-a;', '.a{view-transition-name:.sc-a;}'],
      ['a number', 'opacity: .5;', '.a{opacity:.5;}'],
      ['a transition property list', 'transition-property: .a;', '.a{transition-property:.a;}'],
      [
        'a quoted string in a bare-name property',
        'container-name: ".a .b,.c(.d";',
        '.a{container-name:".a .b,.c(.d";}',
      ],
      [
        'a single-quoted string in a bare-name property',
        "view-transition-class: '.a .b';",
        ".a{view-transition-class:'.a .b';}",
      ],
    ])('keeps the text of %s', (_label, css, expected) => {
      expect(emitWeb(parse(css), '.a')).toEqual([expected]);
    });

    it('leaves a dot inside a token alone', () => {
      expect(emitWeb(parse('view-transition-class: a.b;'), '.a')).toEqual([
        '.a{view-transition-class:a.b;}',
      ]);
    });

    it('does not name a dotted authored name twice when the class is automatic', () => {
      expect(
        emitWeb(
          parse('view-transition-name: card; container-type: size; container-name: .sc-x;'),
          '.a',
          {
            componentId: 'sc-id',
          }
        )
      ).toEqual([
        '.a{view-transition-name:card;container-type:size;container-name:sc-x;view-transition-class:sc-id;}',
      ]);
    });
  });

  describe('parent comma-cross-product respects pseudo-fn parens (#4279)', () => {
    // When the outer selector contains a `,` INSIDE :is()/:where()/:has(),
    // child rules must NOT split that comma as if it were a top-level
    // selector boundary. Bug: parser was doing naive `.split(',')` on the
    // resolved parent selector for child cross-product, splitting :is(...)
    // contents in half and producing nonsense like `.a:hover .grandchild`.
    it('does not split commas inside :is() during child cross-product', () => {
      const out = emit(
        `:is(&:hover, .parent:hover &) .child {
          color: red;
          .grandchild { color: blue; }
        }`
      );
      // The parent `:is(...)` must stay intact in the grandchild rule.
      // Pre-fix bug: the second rule was producing
      // `:is(.a:hover .grandchild, .parent:hover .a) .child .grandchild`
      // (the `.grandchild` got incorrectly injected INTO the first :is arm).
      expect(out).toMatchInlineSnapshot(`
        [
          ":is(.a:hover, .parent:hover .a) .child{color:red;}",
          ":is(.a:hover, .parent:hover .a) .child .grandchild{color:blue;}",
        ]
      `);
    });

    it('does not split commas inside :where() during child cross-product', () => {
      const out = emit(`:where(&, & + &) .child { .nested { color: red; } }`);
      expect(out).toMatchInlineSnapshot(`
        [
          ":where(.a, .a + .a) .child .nested{color:red;}",
        ]
      `);
    });

    it('does not split commas inside :has() during child cross-product', () => {
      const out = emit(`:has(.x, .y) {
        color: red;
        .nested { color: blue; }
      }`);
      expect(out).toMatchInlineSnapshot(`
        [
          ".a :has(.x, .y){color:red;}",
          ".a :has(.x, .y) .nested{color:blue;}",
        ]
      `);
    });

    it('does not split commas inside [attr*="a,b"] during child cross-product', () => {
      const out = emit(`&[data-x*="a,b"] {
        color: red;
        .nested { color: blue; }
      }`);
      expect(out).toMatchInlineSnapshot(`
        [
          ".a[data-x*="a,b"]{color:red;}",
          ".a[data-x*="a,b"] .nested{color:blue;}",
        ]
      `);
    });

    it('still cross-products on TOP-LEVEL parent commas', () => {
      // Sanity: comma OUTSIDE pseudo-fn parens still produces cross-product
      // (this is the case the existing logic was designed for). The bare
      // `.b` selector gets the styled-component selector prepended via
      // parent-space, so it becomes `.a .b`.
      const out = emit(`&, .b { .nested { color: red; } }`);
      expect(out).toMatchInlineSnapshot(`
        [
          ".a .nested,.a .b .nested{color:red;}",
        ]
      `);
    });
  });

  describe('every rule it returns reads as one rule', () => {
    // https://drafts.csswg.org/css-syntax/#consume-qualified-rule
    const rewriteColor = (value: string): EmitOptions => ({
      decl: (prop, authored) => ({ prop, value: prop === 'color' ? value : authored }),
    });

    it.each<[string, string, EmitOptions, string[]]>([
      [
        'a declaration rewrite that closes its block',
        'color: red; top: 0;',
        rewriteColor('x}html{display:none}a{b:y'),
        ['.a{top:0;}'],
      ],
      ['a declaration rewrite that opens a block', 'color: red;', rewriteColor('x{'), []],
      ['a declaration rewrite that opens a string', 'color: red;', rewriteColor('"x'), []],
      [
        'a declaration rewrite that writes a comment',
        'color: red; top: 0;',
        rewriteColor('red /* note */'),
        ['.a{top:0;}'],
      ],
      [
        'a declaration rewrite in an at-rule, keeping its siblings',
        '@media print { color: red; &:hover { top: 0; } }',
        rewriteColor('x}html{display:none}a{b:y'),
        ['@media print{.a:hover{top:0;}}'],
      ],
      [
        'a declaration rewrite in keyframes',
        '@keyframes k { from { color: red; } }',
        rewriteColor('x}}html{display:none}@keyframes j{from{b:y'),
        ['@keyframes k{from{}}'],
      ],
      [
        'a declaration rewrite in a declaration-only at-rule',
        '@font-face { color: red; }',
        rewriteColor('x}html{display:none}a{b:y'),
        [],
      ],
      [
        'a declaration rewrite into several, one of which closes the block',
        'color: red; top: 0;',
        {
          decl: (prop, authored) =>
            prop === 'color'
              ? [
                  { prop: 'a', value: 'b' },
                  { prop: 'x', value: '}' },
                ]
              : { prop, value: authored },
        },
        ['.a{top:0;}'],
      ],
      ['a selector rewrite', 'color: red;', { rw: selector => selector + '{}html' }, []],
      [
        'one selector of a rewrite that returns several',
        'color: red;',
        { rw: selector => [selector, selector + '{}html'] },
        ['.a{color:red;}'],
      ],
    ])('drops what %s leaves', (_label, css, options, expected) => {
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(emitWeb(parse(normalize(css)), '.a', options)).toEqual(expected);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it.each<[string, string, string[]]>([
      [
        'an unquoted url holding a statement end and quotes',
        'background: url(data:image/svg+xml;utf8,<svg a="b"/>);',
        ['.a{background:url(data:image/svg+xml;utf8,<svg a="b"/>);}'],
      ],
      ['a brace in a string', 'content: "}";', ['.a{content:"}";}']],
      ['an escaped brace in a selector', '.b\\{c { top: 0; }', ['.a .b\\{c{top:0;}']],
      ['a brace in an attribute selector', '[data-x="{"] { top: 0; }', ['.a [data-x="{"]{top:0;}']],
      [
        'a nested at-rule',
        '@media print { @media screen { top: 0; } }',
        ['@media print{@media screen{.a{top:0;}}}'],
      ],
    ])('keeps %s', (_label, css, expected) => {
      expect(emit(css)).toEqual(expected);
    });

    it('keeps every rule of a large stylesheet under a selector list', () => {
      const wrapper = `.${'w'.repeat(42)},.${'x'.repeat(42)}`;
      const rule = (i: number) => `.${'r'.repeat(56)}${i}{top:0;}`;
      const rules = Array.from({ length: 1000 }, (_, i) => rule(i)).join('');

      expect(emitWeb(parse(`${wrapper}{${rules}}`), '')).toHaveLength(1000);
    });

    // A rule per sibling, each under its parent's whole list. Once the parent's text passes the
    // size limit every later sibling drops, so their cost must not grow with the parent.
    it('bounds what one emit composes across sibling rules', () => {
      const list = `.${'a'.repeat(20)},.${'b'.repeat(20)}{`;
      const css = `color:red;${list.repeat(12)}${'.x{top:0;}'.repeat(400)}${'}'.repeat(12)}`;
      const ast = parse(css);
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const start = performance.now();
      const rules = emitWeb(ast, '.a');
      const elapsedMs = performance.now() - start;

      expect(rules[0]).toBe('.a{color:red;}');
      expect(rules.join('').length).toBeLessThan(1 << 24);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(elapsedMs).toBeLessThan(500);
    });

    // An at-rule's children take its parent's selector whole, with nothing composed, so each one
    // writes the parent's text again. That text counts, and past the limit a sibling costs nothing.
    const composedList = 'a,a,a,a{'.repeat(8);
    const composedHead = Array.from({ length: 4 ** 8 }, () => `.a${' a'.repeat(8)}`).join(',');
    const longHead = `.a ${'x'.repeat(60000)}`;

    it.each<[string, string, string]>([
      [
        'at-rule siblings under a selector list',
        `${composedList}${'@media x{top:0;}'.repeat(2000)}${'}'.repeat(8)}`,
        `@media x{${composedHead}{top:0;}}`,
      ],
      [
        'nested at-rule siblings under a selector list',
        `${composedList}${'@media x{@media y{top:0;}}'.repeat(2000)}${'}'.repeat(8)}`,
        `@media x{@media y{${composedHead}{top:0;}}}`,
      ],
      [
        'at-rule siblings under a long selector',
        `${'x'.repeat(60000)}{${'@media x{top:0;}'.repeat(20000)}}`,
        `@media x{${longHead}{top:0;}}`,
      ],
      [
        'empty selector lists under a long selector',
        `${'x'.repeat(60000)}{${',{top:0;}'.repeat(20000)}}`,
        `${longHead}{top:0;}`,
      ],
    ])('bounds what one emit writes for %s', (_label, css, expectedRule) => {
      const ast = parse(css);
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const start = performance.now();
      const rules = emitWeb(ast, '.a');
      const elapsedMs = performance.now() - start;

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every(rule => rule === expectedRule)).toBe(true);
      expect(rules.reduce((size, rule) => size + rule.length, 0)).toBeLessThan(1 << 24);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(elapsedMs).toBeLessThan(500);
    });

    // Text a namespace or a plugin adds to a head reaches the output as well as what was composed.
    it.each<[string, string, EmitOptions]>([
      [
        'a namespace',
        `${'a,'.repeat(30000)}a{${'.y{top:0;}'.repeat(2000)}}`,
        { namespace: namespaceForm(`.${'n'.repeat(100)}`) },
      ],
      [
        'a plugin that returns several selectors',
        `${'x'.repeat(60000)}{${'.y{top:0;}'.repeat(2000)}}`,
        { rw: selector => Array.from({ length: 10 }, () => selector) },
      ],
      [
        'a plugin that lengthens a selector',
        `${'x'.repeat(60000)}{${'.y{top:0;}'.repeat(2000)}}`,
        { rw: selector => selector + ' '.repeat(600000) + '.z' },
      ],
    ])('counts the head text %s writes', (_label, css, options) => {
      const ast = parse(css);
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const start = performance.now();
      const rules = emitWeb(ast, '.a', options);
      const elapsedMs = performance.now() - start;

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.reduce((size, rule) => size + rule.length, 0)).toBeLessThan(1 << 24);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(elapsedMs).toBeLessThan(1_000);
    });

    it('reads a deep at-rule without reading its children at every level', () => {
      const depth = 500;
      const css = '@media a{'.repeat(depth) + '.x{a:b;}'.repeat(60000) + '}'.repeat(depth);
      const ast = parse(css);

      const start = performance.now();
      emitWeb(ast, '.a');
      expect(performance.now() - start).toBeLessThan(1_000);
    });

    // Judging a namespace reads each character once, whatever hides inside a group.
    it.each<[string, string]>([
      ['whitespace inside one group', `:is(${'.a '.repeat(80000)})`],
      ['pseudo-elements inside one group', `:is(${'::before'.repeat(30000)})`],
      ['a chain of pseudo-classes', ':a'.repeat(120000)],
    ])('judges a namespace holding %s in linear time', (_label, namespace) => {
      const start = performance.now();
      namespaceForm(namespace);

      expect(performance.now() - start).toBeLessThan(500);
    });

    it('joins a long list of root-anchored items within budget', () => {
      const indexes = Array.from({ length: 20000 }, (_, i) => i);
      const ast = parse(normalize(`${indexes.map(i => `html.a${i} &`).join(',')}{top:0;}`));
      const namespace = namespaceForm('#app');

      const start = performance.now();
      const rules = emitWeb(ast, '.c', { namespace });
      const elapsedMs = performance.now() - start;

      expect(rules).toEqual([`${indexes.map(i => `html#app.a${i} .c`).join(',')}{top:0;}`]);
      expect(elapsedMs).toBeLessThan(500);
    });
  });
});

/**
 * Namespace placement for items anchored at the document root.
 *
 * Selectors 4, 13.1: "The :root pseudo-class represents an element that is the root of the
 * document. For example, in a DOM document, the :root pseudo-class matches the document element.
 * In HTML, this will be the html element (unless scripting has been used to modify the document)."
 * The root is never inside itself, so a descendant prefix (`#app html`) cannot match it; the
 * namespace joins onto the root compound instead (`html#app`).
 *
 * Selectors 4, 3.7 (case sensitivity): "All syntax defined by the Selectors spec is ASCII
 * case-insensitive (i.e. [a-z] and [A-Z] are equivalent), as usual for CSS syntax-this includes
 * pseudo-class and pseudo-element names".
 *
 * Selectors 4, 3.6 (pseudo-elements): "Syntactically, a pseudo-element immediately follows the
 * compound selector representing its originating element. If this compound selector is omitted,
 * it is assumed to be the universal selector *." and "user agents must also accept the previous
 * one-colon notation for the Level 1 & 2 pseudo-elements (::before, ::after, ::first-line, and
 * ::first-letter)". The namespace therefore goes before a pseudo-element, never after it.
 *
 * Selectors 4, 4.2: "The specificity of the :is() pseudo-class is replaced by the specificity of
 * its most specific argument." `:is(#app,#app *)` costs the same as `#app`.
 *
 * View Transitions 2, 5.2: "All of the view transition pseudo-elements are selected from their
 * ultimate originating element, the ViewTransition's root element." For a document transition
 * that is the document element; for a scoped transition it is the scope element.
 *
 * Syntax 3, 4.3.7 (consume an escaped code point): "Consume as many hex digits as possible, but
 * no more than 5. Note that this means 1-6 hex digits have been consumed in total. If the next
 * input code point is whitespace, consume it as well."
 */
describe('namespace on root-anchored items', () => {
  const block = '{a:b;}';

  /** Bare selectors emit as globals (no parent); anything with `&` emits under the component class. */
  function namespaced(source: string, namespace: string): string {
    const css = source.includes('{') ? source : source + block;
    return emitWeb(parse(normalize(css)), source.includes('&') ? '.c' : '', {
      namespace: namespace ? namespaceForm(namespace) : undefined,
    }).join('');
  }

  it.each<[string, string, string]>([
    // A root compound takes the namespace at its end.
    ['html.dark &', '#app', 'html#app.dark .c' + block],
    ['html &', '#app', 'html#app .c' + block],
    ['HTML.dark &', '#app', 'HTML#app.dark .c' + block],
    [':root', '#app', ':root#app' + block],
    [':ROOT &', '#app', ':ROOT#app .c' + block],
    ['html:has(.a .b) &', '#app', 'html#app:has(.a .b) .c' + block],
    ['html[data-x="a b"] &', '#app', 'html#app[data-x="a b"] .c' + block],
    ['html.\\31 0 &', '#app', 'html#app.\\31 0 .c' + block],
    ['html > body &', '#app', 'html#app>body .c' + block],
    ['html>body &', '#app', 'html#app>body .c' + block],
    ['html + body &', '#app', 'html#app+body .c' + block],
    ['html ~ body &', '#app', 'html#app~body .c' + block],
    ['html body.dark &', '#app', 'html#app body.dark .c' + block],
    ['html || td &', '#app', 'html#app || td .c' + block],
    ['html#app &', '#app', 'html#app#app .c' + block],

    // The namespace goes before the first pseudo-element of the compound.
    ['html::view-transition-old(root)', '#app', 'html#app::view-transition-old(root)' + block],
    ['html:before', '#app', 'html#app:before' + block],
    [':root:after', '#app', ':root#app:after' + block],
    ['html:first-line, .c', '#app', 'html#app:first-line,#app .c' + block],
    ['html:FIRST-LETTER', '#app', 'html#app:FIRST-LETTER' + block],
    ['html:hover::after', '#app', 'html#app:hover::after' + block],
    ['html:not(:before) &', '#app', 'html#app:not(:before) .c' + block],
    ['html:is(.a,.b) &', '#app', 'html#app:is(.a,.b) .c' + block],
    ['html[data-x=","] &', '#app', 'html#app[data-x=","] .c' + block],

    // Each list item is judged alone.
    ['html, body', '#app', 'html#app,#app body' + block],
    ['html.dark &,body &', '#app', 'html#app.dark .c,#app body .c' + block],
    ['html.\\31 0 &, & .x', '#app', 'html#app.\\31 0 .c,#app .c .x' + block],

    // A document view-transition pseudo has the namespace element as root or an ancestor of its scope.
    ['::view-transition-group(x)', '#app', ':is(#app,#app *)::view-transition-group(x)' + block],
    ['::VIEW-TRANSITION-GROUP(x)', '#app', ':is(#app,#app *)::VIEW-TRANSITION-GROUP(x)' + block],
    ['*::view-transition-group(x)', '#app', ':is(#app,#app *)::view-transition-group(x)' + block],
    ['::view-transition', '.app', ':is(.app,.app *)::view-transition' + block],

    // Anything else keeps the descendant prefix.
    ['body.dark &', '#app', '#app body.dark .c' + block],
    ['html-viewer &', '#app', '#app html-viewer .c' + block],
    ['html\\-x &', '#app', '#app html\\-x .c' + block],
    [':rootx &', '#app', '#app :rootx .c' + block],
    ['html|div &', '#app', '#app html|div .c' + block],
    [':is(html) &', '#app', '#app :is(html) .c' + block],
    [':where(html.dark) &', '#app', '#app :where(html.dark) .c' + block],
    [':where(:root) &', '#app', '#app :where(:root) .c' + block],
    [':host(.a) &', '#app', '#app :host(.a) .c' + block],
    ['&::view-transition-old(root)', '#app', '#app .c::view-transition-old(root)' + block],
    ['.x', '#app', '#app .x' + block],

    // A rule nested under a root-anchored parent follows the parent.
    ['html.dark &{.icon{a:b;}}', '#app', 'html#app.dark .c .icon' + block],

    // Other joinable namespaces.
    ['html.dark &', '.app', 'html.app.dark .c' + block],
    ['html.dark &', '[data-app="x y"]', 'html[data-app="x y"].dark .c' + block],
    ['html.dark &', ' #app ', 'html#app.dark .c' + block],
    [':root', ':where(.a .b)', ':root:where(.a .b)' + block],

    // A namespace ending in a hex escape keeps it terminated: the escape takes one whitespace
    // after its digits, so the combinator that follows is written as a second one.
    ['html &', '.a\\31 ', 'html.a\\31  .c' + block],
    ['html.dark &', '.a\\31 ', 'html.a\\31 .dark .c' + block],
    [
      '::view-transition-old(root)',
      '.a\\31 ',
      ':is(.a\\31 ,.a\\31  *)::view-transition-old(root)' + block,
    ],
    [
      'html::view-transition-old(root)',
      '.a\\31 ',
      'html.a\\31 ::view-transition-old(root)' + block,
    ],
    ['.x', '.a\\31 ', '.a\\31  .x' + block],
    ['html &', '.a\\31', 'html.a\\31  .c' + block],
    ['html.dark &', '.a\\31', 'html.a\\31 .dark .c' + block],
    [
      '::view-transition-old(root)',
      '.a\\31',
      ':is(.a\\31 ,.a\\31  *)::view-transition-old(root)' + block,
    ],
    ['html::view-transition-old(root)', '.a\\31', 'html.a\\31 ::view-transition-old(root)' + block],
    ['.x', '.a\\31', '.a\\31  .x' + block],
    ['.x', '.a\\\\31', '.a\\\\31 .x' + block],
    ['.x', '.a\\\\\\31', '.a\\\\\\31  .x' + block],
    ['html.dark &', '#a .b\\31', '#a .b\\31  html.dark .c' + block],
    // An escape holds at most six hex digits, so the seventh is a plain name character.
    ['html.dark &', '.a\\1234567', 'html.a\\1234567.dark .c' + block],
    ['.x', '.a\\1234567', '.a\\1234567 .x' + block],

    // A string, an escape or deep nesting hides text from the compound check, however it is written.
    ['html.dark &', '[data-app="]x y"]', 'html[data-app="]x y"].dark .c' + block],
    ['html.dark &', '[data-app="]::x"]', 'html[data-app="]::x"].dark .c' + block],
    ['html.dark &', '.a\\ b', 'html.a\\ b.dark .c' + block],
    ['html.dark &', '.a\\::b', 'html.a\\::b.dark .c' + block],
    ['html.dark &', '.a\\,b', 'html.a\\,b.dark .c' + block],
    ['html.dark &', ':is(.x :is(:is(:is(.a))))', 'html:is(.x :is(:is(:is(.a)))).dark .c' + block],
    ['html.dark &', ':is(")" .a)', 'html:is(")" .a).dark .c' + block],

    // A namespace that is not one compound keeps the prefix on every item.
    ['html.dark &', 'div#app', 'div#app html.dark .c' + block],
    ['html.dark &', 'html#app', 'html#app html.dark .c' + block],
    ['html.dark &', '#a .b', '#a .b html.dark .c' + block],
    ['html.dark &', '#a,#b', '#a,#b html.dark .c' + block],
    ['html.dark &', ' #a .b ', '#a .b html.dark .c' + block],
    ['html.dark &', '#app::before', '#app::before html.dark .c' + block],
    ['html.dark &', '#app:after', '#app:after html.dark .c' + block],
    ['::view-transition-group(x)', '#a .b', '#a .b ::view-transition-group(x)' + block],

    // Padding is trimmed before the namespace is written; whitespace alone leaves one combinator.
    ['.x', ' #app ', '#app .x' + block],
    ['.x', ' .a\\31 ', '.a\\31  .x' + block],
    ['html.dark &', '   ', ' html.dark .c' + block],
    ['.x', '   ', ' .x' + block],

    // No namespace, no change.
    ['html.dark &', '', 'html.dark .c' + block],
    [':root', '', ':root' + block],
  ])('joins a root-anchored item to %j under namespace %j', (source, namespace, expected) => {
    expect(namespaced(source, namespace)).toBe(expected);
  });

  it('keeps a whitespace-separated root compound apart from what follows', () => {
    expect(namespaced('html\n.dark &', '#app')).toBe('html#app\n.dark .c' + block);
  });
});
