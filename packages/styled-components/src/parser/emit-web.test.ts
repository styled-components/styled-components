import { emitWeb } from './emit-web';
import { parse } from './parser';
import { normalize } from '../utils/compiler';

function emit(css: string, selector = '.a'): string[] {
  return emitWeb(parse(normalize(css)), selector);
}

describe('web emitter — output parity with stylis', () => {
  it('emits simple declarations', () => {
    expect(emit(`color: red; background: blue;`)).toEqual(['.a{color:red;background:blue;}']);
  });

  it('collapses non-contiguous base decls into one rule', () => {
    expect(emit(`color: red; &:hover { color: blue; } font-size: 16px;`)).toEqual([
      '.a{color:red;font-size:16px;}',
      '.a:hover{color:blue;}',
    ]);
  });

  it('handles multiple nested rules inside @media', () => {
    expect(emit(`@media (min-width: 500px) { &:hover { a: 1; } &:focus { b: 2; } }`)).toEqual([
      '@media (min-width: 500px){.a:hover{a:1;}.a:focus{b:2;}}',
    ]);
  });

  it('handles @media with mixed base decl + nested rule', () => {
    expect(emit(`@media (min-width: 500px) { background: red; &:hover { color: blue; } }`)).toEqual(
      ['@media (min-width: 500px){.a{background:red;}.a:hover{color:blue;}}']
    );
  });

  it('emits @keyframes preserving frame stops', () => {
    expect(
      emit(`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`)
    ).toEqual(['@keyframes spin{from{transform:rotate(0);}to{transform:rotate(360deg);}}']);
  });

  it('prepends parent-space for bare (non-&) nested selectors', () => {
    expect(emit(`color: red; .foo { color: blue; } .bar .baz { padding: 8px; }`)).toEqual([
      '.a{color:red;}',
      '.a .foo{color:blue;}',
      '.a .bar .baz{padding:8px;}',
    ]);
  });

  it('joins comma-separated nested selectors', () => {
    expect(emit(`&:hover, &:focus { color: blue; }`)).toEqual(['.a:hover,.a:focus{color:blue;}']);
  });

  it('nests at-rules (@media inside @supports)', () => {
    expect(
      emit(`@supports (display: grid) { @media (min-width: 500px) { &:hover { display: grid; } } }`)
    ).toEqual(['@supports (display: grid){@media (min-width: 500px){.a:hover{display:grid;}}}']);
  });

  it('emits @font-face with bare declarations (no selector wrap)', () => {
    expect(emit(`@font-face { font-family: 'Foo'; src: url(foo.woff2); }`)).toEqual([
      "@font-face{font-family:'Foo';src:url(foo.woff2);}",
    ]);
  });

  it('drops empty nested rules but keeps base decls', () => {
    expect(emit(`color: red; &:hover { } font-size: 16px;`)).toEqual([
      '.a{color:red;font-size:16px;}',
    ]);
  });

  it('emits @import block-less', () => {
    expect(emit(`@import url(https://example.com/styles.css); color: red;`)).toEqual([
      '.a{color:red;}',
      '@import url(https://example.com/styles.css);',
    ]);
  });

  it('preserves quoted content values', () => {
    expect(emit(`content: "}"; color: red;`)).toEqual(['.a{content:"}";color:red;}']);
  });

  it('emits @container', () => {
    expect(
      emit(`@container card (min-width: 400px) { padding: 16px; &:hover { padding: 24px; } }`)
    ).toEqual(['@container card (min-width: 400px){.a{padding:16px;}.a:hover{padding:24px;}}']);
  });

  it('emits @layer block-less (layer order declaration)', () => {
    expect(emit(`@layer reset, framework, utilities;`)).toEqual([
      '@layer reset,framework,utilities;',
    ]);
  });

  it('emits @layer block', () => {
    expect(emit(`@layer utilities { color: red; }`)).toEqual(['@layer utilities{.a{color:red;}}']);
  });

  it('handles nested & + & self-reference (combinator spaces stripped)', () => {
    expect(emit(`& + & { margin-left: 8px; }`)).toEqual(['.a+.a{margin-left:8px;}']);
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
      expect(out).toEqual([
        ':is(.a:hover, .parent:hover .a) .child{color:red;}',
        ':is(.a:hover, .parent:hover .a) .child .grandchild{color:blue;}',
      ]);
    });

    it('does not split commas inside :where() during child cross-product', () => {
      const out = emit(`:where(&, & + &) .child { .nested { color: red; } }`);
      expect(out).toEqual([':where(.a, .a + .a) .child .nested{color:red;}']);
    });

    it('does not split commas inside :has() during child cross-product', () => {
      const out = emit(`:has(.x, .y) {
        color: red;
        .nested { color: blue; }
      }`);
      expect(out).toEqual(['.a :has(.x, .y){color:red;}', '.a :has(.x, .y) .nested{color:blue;}']);
    });

    it('does not split commas inside [attr*="a,b"] during child cross-product', () => {
      const out = emit(`&[data-x*="a,b"] {
        color: red;
        .nested { color: blue; }
      }`);
      expect(out).toEqual([
        '.a[data-x*="a,b"]{color:red;}',
        '.a[data-x*="a,b"] .nested{color:blue;}',
      ]);
    });

    it('still cross-products on TOP-LEVEL parent commas', () => {
      // Sanity: comma OUTSIDE pseudo-fn parens still produces cross-product
      // (this is the case the existing logic was designed for). The bare
      // `.b` selector gets the styled-component selector prepended via
      // parent-space, so it becomes `.a .b`.
      const out = emit(`&, .b { .nested { color: red; } }`);
      expect(out).toEqual(['.a .nested,.a .b .nested{color:red;}']);
    });
  });
});
