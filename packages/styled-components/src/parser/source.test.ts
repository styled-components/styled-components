import css from '../constructors/css';
import type { RuleSet } from '../types';
import { DYN, KeyframeFrame, KeyframesNode, NodeKind, RuleNode, TemplateValue } from './ast';
import { evaluateForFastPath, FastPathFragment } from './evaluate';
import { getSource, InterpolationKind, parseSource, Source } from './source';

// Helper to make tagged-template test inputs feel natural.
const tagged = (strings: ReadonlyArray<string>, ...interps: unknown[]) =>
  parseSource(strings, interps);

// Convert the readable `\0S<n>\0` slot form (the parser's wire format) into
// the TemplateValue chunks+slots structure the parser produces. Lets test
// fixtures stay legible while asserting the AST shape directly.
function tv(s: string): TemplateValue {
  const re = /\0S(\d+)\0/g;
  const chunks: string[] = [];
  const slots: number[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    chunks.push(s.substring(last, m.index));
    slots.push(parseInt(m[1], 10));
    last = m.index + m[0].length;
  }
  chunks.push(s.substring(last));
  return { chunks, slots };
}

const redDecl = { kind: NodeKind.Decl, prop: 'color', value: 'red' };

describe('parseSource', () => {
  describe('static templates (no interpolations)', () => {
    it('parses an empty template', () => {
      const src = parseSource([''], []);
      expect(src.ast).toEqual([]);
      expect(src.interpolations).toEqual([]);
    });

    it('parses a simple decl', () => {
      const src = parseSource(['color: red;'], []);
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: 'color', value: 'red' }]);
    });
  });

  describe('value-position interpolations', () => {
    it('embeds a slot that follows a colon', () => {
      const src = tagged`color: ${'red'};`;
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: 'color', value: tv('\0S0\0') }]);
      expect(src.interpolations).toEqual(['red']);
    });

    it('embeds a slot wedged between value tokens', () => {
      const src = tagged`padding: 0 ${10}px;`;
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: 'padding', value: tv('0 \0S0\0px') }]);
    });

    it('keeps both slots embedded when value has two space-separated slots before `;`', () => {
      const src = tagged`padding: ${'8px'} ${'16px'};`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'padding', value: tv('\0S0\0 \0S1\0') },
      ]);
    });
  });

  // Common multi-value shorthands: every slot after the colon stays in the
  // declaration value, however many whitespace-separated slots it holds.
  describe('multi-slot decl values stay embedded', () => {
    it('padding 4-value shorthand', () => {
      const src = tagged`padding: ${'1px'} ${'2px'} ${'3px'} ${'4px'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'padding',
          value: tv('\0S0\0 \0S1\0 \0S2\0 \0S3\0'),
        },
      ]);
    });

    it('margin 3-value shorthand', () => {
      const src = tagged`margin: ${'1px'} ${'2px'} ${'3px'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'margin',
          value: tv('\0S0\0 \0S1\0 \0S2\0'),
        },
      ]);
    });

    it('border shorthand: width style color', () => {
      const src = tagged`border: ${'1px'} solid ${'#000'};`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'border', value: tv('\0S0\0 solid \0S1\0') },
      ]);
    });

    it('box-shadow with x y blur color', () => {
      const src = tagged`box-shadow: ${'0'} ${'2px'} ${'4px'} ${'rgba(0,0,0,0.1)'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'box-shadow',
          value: tv('\0S0\0 \0S1\0 \0S2\0 \0S3\0'),
        },
      ]);
    });

    it('multi box-shadow separated by commas', () => {
      const src = tagged`box-shadow: ${'0'} ${'1px'} ${'2px'} ${'red'}, ${'0'} ${'4px'} ${'8px'} ${'blue'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'box-shadow',
          value: tv('\0S0\0 \0S1\0 \0S2\0 \0S3\0, \0S4\0 \0S5\0 \0S6\0 \0S7\0'),
        },
      ]);
    });

    it('transition shorthand: prop dur ease', () => {
      const src = tagged`transition: ${'opacity'} ${'200ms'} ${'ease-in'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'transition',
          value: tv('\0S0\0 \0S1\0 \0S2\0'),
        },
      ]);
    });

    it('animation shorthand: name dur ease', () => {
      const src = tagged`animation: ${'fadeIn'} ${'1s'} ${'ease-out'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'animation',
          value: tv('\0S0\0 \0S1\0 \0S2\0'),
        },
      ]);
    });

    it('font shorthand with slash for line-height', () => {
      const src = tagged`font: ${'14px'}/${'1.4'} ${'system-ui'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'font',
          value: tv('\0S0\0/\0S1\0 \0S2\0'),
        },
      ]);
    });

    it('grid-template with slash separator', () => {
      const src = tagged`grid-template: ${'auto 1fr'} / ${'1fr 2fr'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'grid-template',
          value: tv('\0S0\0 / \0S1\0'),
        },
      ]);
    });

    it('background shorthand: color image position', () => {
      const src = tagged`background: ${'#fff'} ${'url(/x.png)'} ${'center'};`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'background',
          value: tv('\0S0\0 \0S1\0 \0S2\0'),
        },
      ]);
    });

    it('transform with multiple function calls', () => {
      const src = tagged`transform: translate(${'10px'}, ${'20px'}) rotate(${'45deg'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'transform',
          value: tv('translate(\0S0\0, \0S1\0) rotate(\0S2\0)'),
        },
      ]);
    });

    it('calc with two operand slots', () => {
      const src = tagged`width: calc(${'100%'} - ${'2rem'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'width',
          value: tv('calc(\0S0\0 - \0S1\0)'),
        },
      ]);
    });

    it('clamp with three slots', () => {
      const src = tagged`font-size: clamp(${'14px'}, ${'2vw'}, ${'24px'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'font-size',
          value: tv('clamp(\0S0\0, \0S1\0, \0S2\0)'),
        },
      ]);
    });

    it('linear-gradient with direction and color stops', () => {
      const src = tagged`background: linear-gradient(${'to right'}, ${'red'}, ${'blue'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'background',
          value: tv('linear-gradient(\0S0\0, \0S1\0, \0S2\0)'),
        },
      ]);
    });

    it('color-mix with slots in arms', () => {
      const src = tagged`color: color-mix(in srgb, ${'red'} 50%, ${'blue'});`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'color',
          value: tv('color-mix(in srgb, \0S0\0 50%, \0S1\0)'),
        },
      ]);
    });

    it('multiple decls with multi-slot values do not cross-contaminate', () => {
      const src = tagged`padding: ${'8px'} ${'16px'}; margin: ${'4px'} ${'8px'};`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'padding', value: tv('\0S0\0 \0S1\0') },
        { kind: NodeKind.Decl, prop: 'margin', value: tv('\0S2\0 \0S3\0') },
      ]);
    });
  });

  describe('selector-position interpolations', () => {
    it('reads a slot heading a selector that ends in `{` as a Head', () => {
      const otherComponent = { sentinel: true };
      const src = tagged`${otherComponent} & { color: red; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: [' '], rest: '&', slots: [0] },
        },
      ]);
      expect(src.interpolations).toEqual([otherComponent]);
      expect(src.slotIsStandalone).toEqual([true]);
    });

    it('embeds a slot inside an attribute selector', () => {
      const src = tagged`&[${'aria-pressed'}='true'] { color: red; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [tv(`&[\0S0\0='true']`)],
          children: [redDecl],
        },
      ]);
    });

    it('reads a Head after a declaration', () => {
      const otherComponent = { sentinel: true };
      const src = tagged`color: green; ${otherComponent} & { color: red; }`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'green' },
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: [' '], rest: '&', slots: [0] },
        },
      ]);
    });

    it('keeps the child combinator in the text after a Head', () => {
      const otherComponent = { sentinel: true };
      const src = tagged`color: green; ${otherComponent} > & { color: red; }`;
      expect(src.ast[1]).toEqual({
        kind: NodeKind.Rule,
        selectors: [],
        children: [redDecl],
        head: { gaps: [' '], rest: '> &', slots: [0] },
      });
    });

    it('reads `${Foo} { ... }` as a Head with empty following selector text', () => {
      const otherComponent = { sentinel: true };
      const src = tagged`color: green; ${otherComponent} { color: red; }`;
      expect(src.ast[1]).toEqual({
        kind: NodeKind.Rule,
        selectors: [],
        children: [redDecl],
        head: { gaps: [' '], rest: '', slots: [0] },
      });
    });
  });

  /**
   * Roles come from the one reading of the template the parser does, with
   * each slot as an opaque placeholder. A Run is the group of slots at a
   * statement start separated only by whitespace; it is classified as a
   * whole by what follows it.
   */
  describe('slot roles', () => {
    const a = () => 'x';
    const b = () => 'y';

    it('Standalone: a whitespace-separated Run before a declaration', () => {
      const src = tagged`${a} ${b} color: red;`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 1 },
        redDecl,
      ]);
      expect(src.slotIsStandalone).toEqual([true, true]);
    });

    it('Standalone: a Run with nothing between its slots', () => {
      expect(tagged`${a}${b}`.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 1 },
      ]);
      expect(tagged`${a}${b}\ncolor: red;`.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 1 },
        redDecl,
      ]);
    });

    it('Standalone: a Run followed by `;` or `}`', () => {
      expect(tagged`${a}; color: red;`.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        redDecl,
      ]);
      expect(tagged`& { ${a} }`.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [{ kind: NodeKind.Interpolation, index: 0 }],
        },
      ]);
    });

    it('Standalone: a Run followed by `@`', () => {
      expect(tagged`${a} ${b} @media (min-width: 1px) { color: red; }`.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 1 },
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: '(min-width: 1px)',
          children: [redDecl],
        },
      ]);
    });

    it('Glued: a slot continuing a property name', () => {
      const src = tagged`${'background'}-color: red;`;
      expect(src.ast).toEqual([{ kind: NodeKind.Decl, prop: tv('\0S0\0-color'), value: 'red' }]);
      expect(src.slotIsStandalone).toEqual([false]);
    });

    it('Glued: a slot glued to a pseudo-class in a selector', () => {
      expect(tagged`${a}:hover { color: red; }`.ast).toEqual([
        { kind: NodeKind.Rule, selectors: [tv('\0S0\0:hover')], children: [redDecl] },
      ]);
    });

    it('Glued: a slot glued to `{`', () => {
      expect(tagged`${a}{ color: red; }`.ast).toEqual([
        { kind: NodeKind.Rule, selectors: [tv('\0S0\0')], children: [redDecl] },
      ]);
    });

    it('Glued: a slot glued to `,` in a selector list', () => {
      expect(tagged`${a}, h2 { color: red; }`.ast).toEqual([
        { kind: NodeKind.Rule, selectors: [tv('\0S0\0'), 'h2'], children: [redDecl] },
      ]);
    });

    it('Property: the last slot of a Run glued to `:`', () => {
      const src = tagged`${a} ${'color'}: red;`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: tv('\0S1\0'), value: 'red' },
      ]);
      expect(src.slotIsStandalone).toEqual([true, false]);
    });

    it('Head: a Run before selector text of a rule', () => {
      const src = tagged`${a} ${b} h2 { color: red; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: [' ', ' '], rest: 'h2', slots: [0, 1] },
        },
      ]);
      expect(src.slotIsStandalone).toEqual([true, true]);
    });

    it('Head: a Run whose last slot is glued to the selector text', () => {
      const src = tagged`${a} ${b}:hover { color: red; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: [' '], rest: tv('\0S1\0:hover'), slots: [0] },
        },
      ]);
      expect(src.slotIsStandalone).toEqual([true, false]);
    });

    it('Head: empty following selector text', () => {
      expect(tagged`${a} ${b} { color: red; }`.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: [' ', ' '], rest: '', slots: [0, 1] },
        },
      ]);
    });

    it('keeps the raw whitespace after each Head slot', () => {
      const src = tagged`
        ${a}
        ${b}
        h2 { color: red; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: ['\n        ', '\n        '], rest: 'h2', slots: [0, 1] },
        },
      ]);
    });

    it('reads statements after a Run in order', () => {
      const src = tagged`
        ${a}
        color: red;
        ${b}
        h2 { color: red; }`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        redDecl,
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: ['\n        '], rest: 'h2', slots: [1] },
        },
      ]);
    });

    it('reads a Run nested inside a rule', () => {
      expect(tagged`& { ${a} span { color: red; } }`.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [
            {
              kind: NodeKind.Rule,
              selectors: [],
              children: [redDecl],
              head: { gaps: [' '], rest: 'span', slots: [0] },
            },
          ],
        },
      ]);
    });

    it('keeps later slots in the selector text as Inside', () => {
      expect(tagged`${a} .x ${b} { color: red; }`.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: [' '], rest: tv('.x \0S1\0'), slots: [0] },
        },
      ]);
    });
  });

  describe('keyframes', () => {
    const a = () => '0%';
    const b = () => 'opacity: 1;';

    it('reads a Run before a frame block as a stop Head', () => {
      const src = tagged`@keyframes x { ${a} { opacity: 0; } }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Keyframes,
          name: 'keyframes',
          prelude: 'x',
          frames: [
            {
              children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0' }],
              head: { gaps: [' '], rest: '', slots: [0] },
              stops: [],
            },
          ],
        },
      ]);
      expect(src.slotIsStandalone).toEqual([true]);
    });

    it('keeps a slot glued to a stop Inside the stop', () => {
      const src = tagged`@keyframes x { ${a}{ opacity: 0; } }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Keyframes,
          name: 'keyframes',
          prelude: 'x',
          frames: [
            {
              children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0' }],
              stops: [tv('\0S0\0')],
            },
          ],
        },
      ]);
      expect(src.slotIsStandalone).toEqual([false]);
    });

    it('reads a Standalone Run in the frame list as a frame splice', () => {
      const src = tagged`@keyframes x { from { opacity: 0; } ${b} }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Keyframes,
          name: 'keyframes',
          prelude: 'x',
          frames: [
            { children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0' }], stops: ['from'] },
            { kind: NodeKind.Interpolation, index: 0 },
          ],
        },
      ]);
      expect(src.slotIsStandalone).toEqual([true]);
    });

    it('reads a Standalone Run inside a frame as a declaration splice', () => {
      const src = tagged`@keyframes x { to { ${b} color: red; } }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Keyframes,
          name: 'keyframes',
          prelude: 'x',
          frames: [
            {
              children: [{ kind: NodeKind.Interpolation, index: 0 }, redDecl],
              stops: ['to'],
            },
          ],
        },
      ]);
      expect(src.slotIsStandalone).toEqual([true]);
    });
  });

  /**
   * A css fragment interpolated directly whose source holds `;`, `{`, or `}`
   * outside strings and parentheses, met in a declaration value whose
   * previous significant item is a value item, ends that declaration.
   */
  describe('missing-`;` recovery', () => {
    const block = css`
      margin: 0;
    `;

    it('ends a declaration before a block fragment', () => {
      const src = tagged`color: red ${block}`;
      expect(src.ast).toEqual([redDecl, { kind: NodeKind.Interpolation, index: 0 }]);
      expect(src.slotIsStandalone).toEqual([true]);
    });

    it('counts a preceding slot as a value item', () => {
      const src = parseSource(['margin: 0 ', 'px\n', ';'], [10, block]);
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'margin', value: tv('0 \0S0\0px') },
        { kind: NodeKind.Interpolation, index: 1 },
      ]);
    });

    it('applies after a slot value directly', () => {
      const src = tagged`padding: ${'1px'} ${block} color: red;`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'padding', value: tv('\0S0\0') },
        { kind: NodeKind.Interpolation, index: 1 },
        redDecl,
      ]);
    });

    it('does not apply in a statement that ends in `{`', () => {
      const src = tagged`&:hover ${block} { color: blue; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [tv('&:hover \0S0\0')],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
      expect(src.slotIsStandalone).toEqual([false]);
    });

    it('does not apply when the text after the fragment runs on to a `{`', () => {
      const src = tagged`color: red ${block} &:hover { color: blue; }`;
      expect(src.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [tv('color: red \0S0\0 &:hover')],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });

    it('does not apply right after `:`', () => {
      expect(tagged`color: ${block};`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: tv('\0S0\0') },
      ]);
    });

    it('never applies inside parentheses', () => {
      expect(tagged`@media (${block}) { color: red; }`.ast).toEqual([
        { kind: NodeKind.AtRule, name: 'media', prelude: tv('(\0S0\0)'), children: [redDecl] },
      ]);
      expect(tagged`background: url(${block});`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'background', value: tv('url(\0S0\0)') },
      ]);
      expect(tagged`width: calc(1px ${block});`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'width', value: tv('calc(1px \0S0\0)') },
      ]);
      expect(tagged`@media (min-width: 1px ${block}) { color: red; }`.ast).toEqual([
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: tv('(min-width: 1px \0S0\0)'),
          children: [redDecl],
        },
      ]);
      expect(tagged`background: url(a ${block});`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'background', value: tv('url(a \0S0\0)') },
      ]);
    });

    it('never applies inside a string', () => {
      expect(tagged`content: "a ${block}";`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'content', value: tv('"a \0S0\0"') },
      ]);
    });

    it('does not apply to a fragment returned by a function', () => {
      expect(tagged`color: red ${() => block}`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: tv('red \0S0\0') },
      ]);
    });

    it('does not apply to a fragment without `;`, `{`, or `}`', () => {
      const valueFragment = css`blue`;
      expect(tagged`color: red ${valueFragment}`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: tv('red \0S0\0') },
      ]);
    });

    // CSS Syntax 3 §4.3.1 "Consume a token": "U+005C REVERSE SOLIDUS (\): If
    // the input stream starts with a valid escape, reconsume the current
    // input code point, consume an ident-like token, and return it." An
    // escaped `;` is part of an identifier, not a statement end, just as the
    // parser reads the fragment's own text.
    it('does not count an escaped `;` in the fragment as a statement end', () => {
      const escaped = css`a\\;b`;
      expect(tagged`color: red ${escaped}`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: tv('red \0S0\0') },
      ]);
    });
  });

  describe('slot bookkeeping', () => {
    it('makes a slot inside a comment Static-empty', () => {
      const fn = jest.fn(() => 'color: blue;');
      const src = tagged`/* ${fn} */ color: ${'red'};`;
      expect(src.kinds).toEqual([InterpolationKind.Static, InterpolationKind.Static]);
      expect(src.staticValues).toEqual(['', 'red']);
    });

    it('removes a comment inside parentheses with the slot written in it, never evaluating the slot', () => {
      const fn = jest.fn(() => 'x');
      const src = tagged`&:is(/* ${fn} */ body) { color: red; }`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Rule, selectors: ['&:is( body)'], children: [redDecl] },
      ]);
      expect(src.kinds).toEqual([InterpolationKind.Static]);
      expect(src.staticValues).toEqual(['']);
    });

    it('makes a slot in a dropped statement Static-empty', () => {
      const fn = jest.fn(() => 'x');
      const src = tagged`${fn}junk; color: red;`;
      expect(src.ast).toEqual([redDecl]);
      expect(src.kinds).toEqual([InterpolationKind.Static]);
      expect(src.staticValues).toEqual(['']);
    });

    it('records the entry state of each kept slot', () => {
      const src = tagged`
        ${'a'}
        content: "x ${'b'}";
        background: url(${'c'}) no-repeat;
        width: calc((${'d'}));
        color: ${'e'};
        /* ${'f'} */
      `;
      expect(src.slotEntries).toEqual([
        { parenDepth: 0, quote: 0, url: false },
        { parenDepth: 0, quote: 34, url: false },
        { parenDepth: 1, quote: 0, url: true },
        { parenDepth: 2, quote: 0, url: false },
        { parenDepth: 0, quote: 0, url: false },
        null,
      ]);
    });

    it('tags exactly the nodes that hold a slot, or have a descendant that does, as dynamic', () => {
      const f = () => 'x';
      const src = tagged`
        color: red;
        width: ${f};
        &:hover { color: blue; }
        .a { .b { margin: ${f}; } }
        @media (min-width: 1px) { color: red; }
        @media ${f} { color: red; }
        @supports (display: grid) { ${f} }
        @keyframes k { from { opacity: 0; } }
        @keyframes k2 { from { opacity: ${f}; } }
        ${f} h1 { color: red; }
      `;
      const isDyn = (node: object) => (node as { [DYN]?: boolean })[DYN] === true;
      const hover = src.ast[2] as RuleNode;
      const inner = (src.ast[3] as RuleNode).children[0] as RuleNode;
      expect(src.ast.map(isDyn)).toEqual([
        false,
        true,
        false,
        true,
        false,
        true,
        true,
        false,
        true,
        true,
      ]);
      const firstFrame = (node: object) => (node as KeyframesNode).frames[0] as KeyframeFrame;
      expect([
        isDyn(inner),
        isDyn(inner.children[0]),
        isDyn(hover.children[0]),
        isDyn(firstFrame(src.ast[7]).children[0]),
        isDyn(firstFrame(src.ast[8]).children[0]),
      ]).toEqual([true, true, false, false, true]);
    });

    it('records a quoted url( argument as a string, not an unquoted url', () => {
      const src = tagged`background: url("${'a'}");`;
      expect(src.slotEntries).toEqual([{ parenDepth: 1, quote: 34, url: false }]);
    });
  });

  describe('slots that start a statement', () => {
    const a = () => 'x';
    const b = () => 'y';

    it('keeps consecutive mixins standalone before a declaration', () => {
      const src = tagged`
        ${a}
        ${b}
        color: red;`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 1 },
        redDecl,
      ]);
    });

    it('ignores a `{` inside a string or parentheses when finding where a statement ends', () => {
      expect(tagged`${a} content: "{" ; ${b} background: url({);`.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'content', value: '"{"' },
        { kind: NodeKind.Interpolation, index: 1 },
        { kind: NodeKind.Decl, prop: 'background', value: 'url({)' },
      ]);
    });
  });

  describe('block-position interpolations', () => {
    it('emits Interpolation node when slot follows `;`', () => {
      const fn = () => 'background: blue;';
      const src = tagged`color: red; ${fn} margin: 0;`;
      expect(src.ast).toEqual([
        redDecl,
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
      expect(src.interpolations).toEqual([fn]);
    });

    it('emits Interpolation node when slot is the entire template', () => {
      const fn = () => 'color: red;';
      const src = tagged`${fn}`;
      expect(src.ast).toEqual([{ kind: NodeKind.Interpolation, index: 0 }]);
      expect(src.interpolations).toEqual([fn]);
    });

    it('emits Interpolation nodes for slots that follow `}`', () => {
      const fn = () => 'margin: 0;';
      const src = tagged`& { color: red; } ${fn}`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Rule, selectors: ['&'], children: [redDecl] },
        { kind: NodeKind.Interpolation, index: 0 },
      ]);
    });

    it('reads a stray component reference on its own line as Standalone', () => {
      const Child = { styledComponentId: 'sc-child' };
      const src = tagged`
        ${Child}
        color: red;`;
      expect(src.ast).toEqual([{ kind: NodeKind.Interpolation, index: 0 }, redDecl]);
    });
  });

  describe('mixed interpolations', () => {
    it('disambiguates value vs block in the same template', () => {
      const fn = () => 'background: blue;';
      const src = tagged`color: ${'red'}; ${fn} margin: 0;`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: tv('\0S0\0') },
        { kind: NodeKind.Interpolation, index: 1 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
      expect(src.interpolations).toEqual(['red', fn]);
    });
  });

  describe('slots inside quoted strings', () => {
    it('embeds a slot that follows a `;` inside a string', () => {
      expect(tagged`content: "a;${'b'}";`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'content', value: tv('"a;\0S0\0"') },
      ]);
    });

    /**
     * Deviation from CSS Syntax 3 §4.3.5
     * (https://drafts.csswg.org/css-syntax-3/#consume-string-token):
     * "newline: This is a parse error. Reconsume the current input code
     * point, create a <bad-string-token>, and return it." The parser and
     * `normalize` keep the string open instead, and a slot inside it is read
     * the same way as the text around it.
     */
    it('keeps a string open across a newline, as the parser does', () => {
      const src = tagged`content: "a
        color: 'x'; ${'b'}`;
      expect(src.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'content', value: tv(`"a\n        color: 'x'; \0S0\0`) },
      ]);
    });
  });

  /**
   * CSS Syntax 3 §9 (https://drafts.csswg.org/css-syntax-3/#serialization):
   * "The tokenizer described in this specification does not produce tokens
   * for comments, or otherwise preserve them in any way. Implementations may
   * preserve the contents of comments and their location in the token
   * stream. If they do, this preserved information must have no effect on
   * the parsing step."
   *
   * Comments are removed before the template is read, so a slot's role never
   * depends on a comment next to it. JS-style `//` line comments are a
   * styled-components extension held to the same rule.
   */
  describe('comments next to a slot', () => {
    const Child = { sentinel: true };
    const fn = () => 'margin: 0;';
    const nestedRule = (gap: string) => [
      { kind: NodeKind.Decl, prop: 'color', value: 'green' },
      {
        kind: NodeKind.Rule,
        selectors: [],
        children: [redDecl],
        head: { gaps: [gap], rest: '', slots: [0] },
      },
    ];

    it('reads a component Head when a block comment precedes `{`', () => {
      expect(tagged`color: green; ${Child} /* note */ { color: red; }`.ast).toEqual(
        nestedRule(' ')
      );
    });

    it('reads a component Head when a line comment precedes `{`', () => {
      const src = tagged`color: green; ${Child} // note
        { color: red; }`;
      expect(src.ast).toEqual(nestedRule(' \n        '));
    });

    it('reads a component Head when a comment precedes `&`', () => {
      expect(tagged`color: green; ${Child} /* note */ & { color: red; }`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'green' },
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [redDecl],
          head: { gaps: [' '], rest: '&', slots: [0] },
        },
      ]);
    });

    it('keeps a property-name slot in its declaration when a comment precedes `:`', () => {
      expect(tagged`color: green; ${'color'} /* note */: red;`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'green' },
        { kind: NodeKind.Decl, prop: tv('\0S0\0'), value: 'red' },
      ]);
    });

    it('keeps a mixin standalone when a block comment follows `;`', () => {
      expect(tagged`color: red; /* note */ ${fn}`.ast).toEqual([
        redDecl,
        { kind: NodeKind.Interpolation, index: 0 },
      ]);
    });

    it('keeps a mixin standalone when a line comment follows `;`', () => {
      const src = tagged`color: red; // note
        ${fn}`;
      expect(src.ast).toEqual([redDecl, { kind: NodeKind.Interpolation, index: 0 }]);
    });

    it('keeps a mixin standalone when a comment follows `{`', () => {
      expect(tagged`& { /* note */ ${fn} }`.ast).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [{ kind: NodeKind.Interpolation, index: 0 }],
        },
      ]);
    });

    it('keeps both mixins standalone when a comment separates them', () => {
      expect(tagged`${fn} /* note */ ${fn}`.ast).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 1 },
      ]);
    });

    it('drops a slot that sits inside a comment and keeps later slot indices', () => {
      expect(tagged`/* ${fn} */ color: ${'red'};`.ast).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: tv('\0S1\0') },
      ]);
    });

    it('leaves an absolute URL intact around a value slot', () => {
      expect(tagged`background: url(https://cdn.example/${'a'}.png);`.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'background',
          value: tv('url(https://cdn.example/\0S0\0.png)'),
        },
      ]);
    });

    it('leaves a protocol-relative URL intact around a value slot', () => {
      expect(tagged`background: url(//cdn.example/${'a'}.png);`.ast).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'background',
          value: tv('url(//cdn.example/\0S0\0.png)'),
        },
      ]);
    });
  });
});

describe('shared template parses', () => {
  const sourceOf = (rules: RuleSet<object>): Source => {
    const source = getSource(rules);
    if (source === undefined) throw new Error('css fragment without a source');
    return source;
  };

  it('parses a css call site once and keeps each call’s own values', () => {
    const make = (value: string) => css`color: ${value};`;
    const a = sourceOf(make('red'));
    const b = sourceOf(make('blue'));

    expect(b.ast).toBe(a.ast);
    expect(b.slotEntries).toBe(a.slotEntries);
    expect(b.slotIsStandalone).toBe(a.slotIsStandalone);
    expect(b.id).toBe(a.id);
    expect(a.id).toBeGreaterThan(0);
    expect(a.staticValues).toEqual(['red']);
    expect(b.staticValues).toEqual(['blue']);
    expect(b.interpolations).toEqual(['blue']);
  });

  it('parses a css call site without slots once', () => {
    const make = () => css`color: red;`;
    expect(sourceOf(make()).ast).toBe(sourceOf(make()).ast);
  });

  it('gives different call sites with the same text their own parse and id', () => {
    const a = sourceOf(css`color: red;`);
    const b = sourceOf(css`color: red;`);
    expect(b.ast).toEqual(a.ast);
    expect(b.ast).not.toBe(a.ast);
    expect(b.id).not.toBe(a.id);
  });

  it('never shares a parse between calls where a block fragment ends a declaration and calls where it cannot', () => {
    const block = css`
      margin: 0;
    `;
    const make = (value: unknown) => css`color: red ${value}`;
    const recovered = [redDecl, { kind: NodeKind.Interpolation, index: 0 }];
    const inline = [{ kind: NodeKind.Decl, prop: 'color', value: tv('red \0S0\0') }];

    const text = sourceOf(make('blue'));
    const fragment = sourceOf(make(block));
    expect(text.ast).toEqual(inline);
    expect(fragment.ast).toEqual(recovered);
    expect(fragment.slotIsStandalone).toEqual([true]);
    expect(text.slotIsStandalone).toEqual([false]);
    expect(fragment.id).not.toBe(text.id);

    expect(sourceOf(make('green')).ast).toBe(text.ast);
    expect(sourceOf(make(block)).ast).toBe(fragment.ast);
    expect(sourceOf(make(() => block)).ast).toBe(text.ast);
  });

  it('never shares a parse between calls where a Head holds a client reference and calls where it does not', () => {
    const clientRef = { $$typeof: Symbol.for('react.client.reference'), $$id: 'x#Child' };
    const styledRef = { styledComponentId: 'sc-child' };
    const make = (value: unknown) => css`${value} h2 { color: red; }`;
    const headOf = (source: Source) => (source.ast[0] as RuleNode).head;

    const resolved = sourceOf(make(styledRef));
    const client = sourceOf(make(clientRef));
    expect(headOf(resolved)?.unresolved).toBeUndefined();
    expect(headOf(client)?.unresolved).toBe(true);
    expect(client.kinds).toEqual([InterpolationKind.Unresolved]);
    expect(resolved.staticValues).toEqual(['.sc-child']);

    expect(sourceOf(make(styledRef)).ast).toBe(resolved.ast);
    expect(sourceOf(make(clientRef)).ast).toBe(client.ast);
  });

  it('keeps a slot inside a comment Static-empty on every call', () => {
    const make = (fn: () => string) => css`/* ${fn} */ color: ${'red'};`;
    const first = jest.fn(() => 'color: blue;');
    const second = jest.fn(() => 'color: blue;');
    sourceOf(make(first));
    const src = sourceOf(make(second));
    expect(src.kinds).toEqual([InterpolationKind.Static, InterpolationKind.Static]);
    expect(src.staticValues).toEqual(['', 'red']);
  });

  it('parses the css function form once per slot count', () => {
    const make = () => css(() => 'color: red;');
    expect(sourceOf(make()).ast).toBe(sourceOf(make()).ast);
  });

  it('parses a fresh array met at a standalone slot once per length', () => {
    const src = tagged`${() => ['color: red;', 'margin: 0;']}`;
    const spliced = () => {
      const fragments: (FastPathFragment | null)[] = [];
      evaluateForFastPath(src, {}, undefined, undefined, fragments);
      const frag = fragments[0];
      if (frag === null || frag === undefined) throw new Error('array not spliced');
      return frag;
    };
    const a = spliced();
    const b = spliced();
    expect(b.source.ast).toBe(a.source.ast);
    expect(b.filled).toEqual(['color: red;', 'margin: 0;']);
  });
});
