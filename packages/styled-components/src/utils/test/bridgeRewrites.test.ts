import { KNOWN_PSEUDOS } from '../../native/pseudoBits';
import {
  alignContentFor,
  rewriteBridgeValue,
  rewriteDisabledTokens,
  wrapComponentNots,
} from '../bridgeRewrites';

/** A scan takes a few milliseconds on these inputs; a quadratic one takes seconds, so the margin absorbs a loaded machine. */
const SCAN_BUDGET_MS = 250;

/*
 * CSS Custom Properties for Cascading Variables 2 (https://drafts.csswg.org/css-variables-2/),
 * quoted from the editor's draft.
 *
 * 3 Using Cascading Variables: the var() notation
 *   "var() = var( <custom-property-name> , <declaration-value>? )"
 *   "The second argument to the function, if provided, is a fallback value, which is used as the
 *   substitution value when the value of the referenced custom property is the guaranteed-invalid
 *   value."
 *
 * So `var(--s, 4)px` is a function followed by an identifier, never a `<dimension>`, and a browser
 * drops it from any property; `calc(var(--s, 4) * 1px)` is a `<length>` whenever the variable holds
 * a `<number>`. Every other value, unitless math included, is left as authored.
 */
describe('rewriteBridgeValue', () => {
  test.each([
    ['--gap', 'var(--s, 4)px', 'calc(var(--s, 4) * 1px)'],
    ['padding', 'var(--s, 4)px', 'calc(var(--s, 4) * 1px)'],
    ['padding', 'var(--s,13)px', 'calc(var(--s, 13) * 1px)'],
    ['margin', 'var(--s, 2)REM', 'calc(var(--s, 2) * 1REM)'],
    ['width', 'var(--s, 50)%', 'calc(var(--s, 50) * 1%)'],
    ['transition', 'opacity var(--d, 100)ms', 'opacity calc(var(--d, 100) * 1ms)'],
    ['padding', 'var(--s, 4)px !important', 'calc(var(--s, 4) * 1px) !important'],
    ['padding', 'var(--a, -1.5e2)px', 'calc(var(--a, -1.5e2) * 1px)'],
    ['padding', 'var(--a, +.5)em', 'calc(var(--a, +.5) * 1em)'],
    ['padding', 'var( --a , 1 )px', 'calc(var(--a, 1) * 1px)'],
    ['margin', 'var(--a, 1)px var(--b, 2)px', 'calc(var(--a, 1) * 1px) calc(var(--b, 2) * 1px)'],
    ['width', 'calc(var(--s, 4)px + 1px)', 'calc(calc(var(--s, 4) * 1px) + 1px)'],
    ['width', 'abs(var(--a, 1)px)', 'abs(calc(var(--a, 1) * 1px))'],
    ['background', 'url(var(--x,4)px) var(--s,4)px', 'url(var(--x,4)px) calc(var(--s, 4) * 1px)'],
    ['background', 'url("a)") var(--s,4)px', 'url("a)") calc(var(--s, 4) * 1px)'],
    ['content', '"var(--a, 1)px" var(--s, 4)px', '"var(--a, 1)px" calc(var(--s, 4) * 1px)'],
    ['padding', 'VAR(--s,1)px', 'calc(var(--s, 1) * 1px)'],
    [
      'padding',
      'Var(--s, 1)px 1px vAr(--t, 2)PX',
      'calc(var(--s, 1) * 1px) 1px calc(var(--t, 2) * 1PX)',
    ],
    ['background', 'URL(VAR(--x,4)px) VAR(--s,4)px', 'URL(VAR(--x,4)px) calc(var(--s, 4) * 1px)'],
  ])('rewrites %s: %s', (prop, value, expected) => {
    expect(rewriteBridgeValue(prop, value)).toEqual({ prop, value: expected });
  });

  test.each([
    'vi',
    'vb',
    'svi',
    'svb',
    'lvi',
    'lvb',
    'dvi',
    'dvb',
    'svmin',
    'svmax',
    'lvmin',
    'lvmax',
    'dvmin',
    'dvmax',
    'VI',
  ])('rewrites a var() followed by the viewport unit %s', unit => {
    expect(rewriteBridgeValue('width', 'var(--s, 1)' + unit)).toEqual({
      prop: 'width',
      value: 'calc(var(--s, 1) * 1' + unit + ')',
    });
  });

  test.each([
    // A value with no var() is left as authored, unitless math included.
    ['width', 'abs(-4)'],
    ['width', 'calc(100% - 2px)'],
    ['width', '10px'],
    ['width', ''],
    // A var() inside other math.
    ['width', 'abs(var(--a))'],
    // Values holding a string or a url token.
    ['content', '"var(--a, 1)px"'],
    ['content', "'var(--a, 1)px'"],
    ['content', '"a\\"var(--a, 1)px"'],
    ['background', 'url(var(--a,1)px)'],
    ['background', 'url(a,var(--x,4)px) red'],
    ['background', 'URL(var(--x,4)px)'],
    ['background', 'url("a);width:abs(1);")'],
    ['background', '\\75rl(var(--x,4)px)'],
    // A var() with no number fallback, no unit, or an unknown unit.
    ['color', 'var(--fg, red)'],
    ['opacity', 'var(--o, 0.5)'],
    ['padding', 'var(--s, 13)bogus'],
    ['padding', 'var(--s, 13)px2'],
    ['padding', 'var(--s, 13) px'],
    ['padding', 'var(--s)px'],
    ['padding', 'var(--s, 1 2)px'],
    ['padding', 'var(--s, 13'],
    ['padding', 'myvar(--s, 13)px'],
  ])('leaves %s: %s', (prop, value) => {
    expect(rewriteBridgeValue(prop, value)).toBeUndefined();
  });

  test('rewrites a var() with a unit once per match and leaves the text between them whole', () => {
    expect(rewriteBridgeValue('margin', '1px  var(--a,1)px /* x */ var(--b,2)em')).toEqual({
      prop: 'margin',
      value: '1px  calc(var(--a, 1) * 1px) /* x */ calc(var(--b, 2) * 1em)',
    });
  });

  test.each([
    ['a long run of padding in a var()', 'padding', 'var(--a,' + ' '.repeat(40000) + '1)px X'],
    ['a long run of var() with no unit', 'padding', 'var(--a,1) '.repeat(20000)],
    ['a long run of var() with a unit', 'padding', 'var(--a,1)px '.repeat(20000)],
    ['a long run of unclosed var()', 'padding', 'var(--a,1'.repeat(20000)],
    ['a long run of urls and matches', 'background', 'url(a) var(--a,1)px '.repeat(10000)],
    ['a long string holding matches', 'content', '"' + 'var(--a,1)px '.repeat(10000) + '"'],
    ['a long run of strings', 'content', '"a" '.repeat(40000) + 'var(--a,1)px'],
    ['a long run of escapes', 'padding', '\\'.repeat(40000) + 'var(--a,1)px'],
    ['a long run of open urls', 'background', 'url('.repeat(20000) + 'var(--a,1)px'],
  ])('scans %s within a wall-clock budget', (_name, prop, value) => {
    const t0 = Date.now();
    rewriteBridgeValue(prop, value);

    expect(Date.now() - t0).toBeLessThan(SCAN_BUDGET_MS);
  });
});

/*
 * Selectors Level 4 (https://drafts.csswg.org/selectors-4/), quoted from the editor's draft.
 *
 * 4.3 The Negation (Matches-None) Pseudo-class: :not()
 *   "Note: The specificity of the :not() pseudo-class is replaced by the specificity of the most
 *   specific selector in its argument; thus it has the exact behavior of :not(:is(argument))."
 *
 * 4.4 The Specificity-adjustment Pseudo-class: :where()
 *   "The Specificity-adjustment pseudo-class, :where(), is a functional pseudo-class with the
 *   same syntax and functionality as :is()."
 *
 * 15 Calculating a selector's specificity
 *   "count the number of class selectors, attributes selectors, and pseudo-classes in the
 *   selector (= B)"
 *   "The specificity of an :is(), :not(), or :has() pseudo-class is replaced by the specificity of
 *   the most specific complex selector in its selector list argument."
 *   "The specificity of a :where() pseudo-class is replaced by zero."
 *
 * So `.c:not([a])` and `.c[data-x]` both weigh (0,2,0) and the later one wins, while each further
 * `:not()` adds (0,1,0) and beats `.c[data-x]` wherever it sits. Inside `:where()` a run of
 * `:not()` weighs nothing, so source order decides. A `:not()` holding a known pseudo-class or a
 * parenthesized argument stays as written, and so does every `:not()` outside the component's own
 * compound (a descendant, a sibling, a context compound).
 */
describe('wrapComponentNots', () => {
  test.each([
    ['.c:not([a])', '.c:where(:not([a]))'],
    ['.c:not([a]):not([b])', '.c:where(:not([a]):not([b]))'],
    ['.c:not([a="x"])', '.c:where(:not([a="x"]))'],
    [".c:not([a='x']):not([b='y'])", ".c:where(:not([a='x']):not([b='y']))"],
    ['.c:not([a="it\'s"])', '.c:where(:not([a="it\'s"]))'],
    ['.c:not([x="a)b"])', '.c:where(:not([x="a)b"]))'],
    [".c:not([x='a)b'])", ".c:where(:not([x='a)b']))"],
    ['.c:not([x="a(b"])', '.c:where(:not([x="a(b"]))'],
    ['.c:not(.a):not([x="a)b"])', '.c:where(:not(.a):not([x="a)b"]))'],
    ['.c:hover:not([x])', '.c:hover:where(:not([x]))'],
    ['.c:disabled:not([x])', '.c:disabled:where(:not([x]))'],
    ['.c:enabled:not([x])', '.c:enabled:where(:not([x]))'],
    ['.c:not(:nth-child(2n)):not([x])', '.c:not(:nth-child(2n)):where(:not([x]))'],
    ['.c:not([x])::before', '.c:where(:not([x]))::before'],
    ['.c:not([x])::before:not([y])', '.c:where(:not([x]))::before:not([y])'],
    ['.c:not([x]) ', '.c:where(:not([x])) '],
    ['.c:not([x])[y]:not([z])', '.c:where(:not([x]))[y]:where(:not([z]))'],
    ['.c:not( [x] )', '.c:where(:not( [x] ))'],
    ['.c:not([x]):not(.a:hover)', '.c:where(:not([x]):not(.a:hover))'],
    ['.c:not(:checked)', '.c:where(:not(:checked))'],
    ['.c:not(:hover.a)', '.c:where(:not(:hover.a))'],
    ['.c.c:not([a])', '.c.c:where(:not([a]))'],
    ['.c:NOT([x])', '.c:where(:NOT([x]))'],
    ['.c:Not([x]):nOt([y])', '.c:where(:Not([x]):nOt([y]))'],
  ])('wraps %s', (selector, expected) => {
    expect(wrapComponentNots(selector, '.c')).toBe(expected);
  });

  test.each([
    ['.c:not([x]),.c:not([y])', '.c:where(:not([x])),.c:where(:not([y]))'],
    ['.c:not([x]), .c:not([y])', '.c:where(:not([x])), .c:where(:not([y]))'],
    ['.d,.c:not([a])', '.d,.c:where(:not([a]))'],
    ['.c:not([x]),.d,.c:not([y])', '.c:where(:not([x])),.d,.c:where(:not([y]))'],
    ['.c .x:not([a]),.c:not([b])', '.c .x:not([a]),.c:where(:not([b]))'],
    ['.c:not([a]) .x:not([b]),.c:not([c])', '.c:not([a]) .x:not([b]),.c:where(:not([c]))'],
    ['.d:not([x],[y]),.c:not([z])', '.d:not([x],[y]),.c:where(:not([z]))'],
    ['.d:is(.a,.b),.c:not([z])', '.d:is(.a,.b),.c:where(:not([z]))'],
    ['.d[x="a,b"],.c:not([z])', '.d[x="a,b"],.c:where(:not([z]))'],
  ])('wraps each own comma member of %s', (selector, expected) => {
    expect(wrapComponentNots(selector, '.c')).toBe(expected);
  });

  test.each([
    ['.app .c:not([a])', '.app .c:where(:not([a]))'],
    ['.app .c:not([a]),.app .c:not([b])', '.app .c:where(:not([a])),.app .c:where(:not([b]))'],
    ['.app .c:not([a])::before', '.app .c:where(:not([a]))::before'],
  ])('wraps behind a namespace head: %s', (selector, expected) => {
    expect(wrapComponentNots(selector, '.app .c')).toBe(expected);
  });

  test.each([
    ['the :disabled token rewrite', ':is(:disabled,[aria-disabled=true])'],
    ['the :enabled token rewrite', ':not(:is(:disabled,[aria-disabled=true]))'],
  ])('leaves %s as written and wraps its sibling in place', (_name, group) => {
    expect(wrapComponentNots('.c' + group + ':not([x])', '.c')).toBe(
      '.c' + group + ':where(:not([x]))'
    );
    expect(wrapComponentNots('.c:not([x])' + group, '.c')).toBe('.c:where(:not([x]))' + group);
  });

  test.each([...KNOWN_PSEUDOS.keys()])(
    'leaves :not(:%s) as written in every spelling, beside a wrapped sibling',
    name => {
      for (const spelled of [':' + name, ':' + name.toUpperCase(), ' :' + name + ' ']) {
        const group = ':not(' + spelled + ')';

        expect(wrapComponentNots('.c' + group, '.c')).toBe('.c' + group);
        expect(wrapComponentNots('.c' + group + ':not([x])', '.c')).toBe(
          '.c' + group + ':where(:not([x]))'
        );
      }
    }
  );

  test.each([
    ['an escape in a string', '.c:not([a="x\\"y"])'],
    ['an escaped paren', '.c:not(\\))'],
    ['an escaped class name', '.c:not(.a\\:b)'],
    ['a nested function', '.c:not(:is(.a))'],
    ['a nested :not', '.c:not(:not(.a))'],
    ['a pseudo-element before the group', '.c::before:not([x])'],
    ['no :not', '.c:hover'],
    ['a :not with no group', '.c:nth-child(2n):not'],
  ])('leaves a head with %s unchanged', (_name, selector) => {
    expect(wrapComponentNots(selector, '.c')).toBe(selector);
  });

  test.each([
    ['an unclosed string', '.c:not([x="a)'],
    ['an unclosed string in a closed group', '.c:not([x="a)):not([y])'],
    ['an open bracket', '.c:not([x'],
    ['an open paren', '.c:not([x]'],
    ['a block in the argument', '.c:not([x]{a:b})'],
    ['a stray close paren', '.c:not([x])):not([y])'],
    ['a stray close bracket', '.c:not([x])]:not([y])'],
    ['an unclosed second group', '.c:not([x]):not([y'],
    ['an unclosed group in a skipped member', '.d:not([x,.c:not([y])'],
    ['an unclosed string in a skipped member', '.d[x="a,.c:not([y])'],
    ['an unclosed string in the next member', '.c:not([x]),.d[x="a'],
    ['a url token in the head', ".c:not(url(a'b))"],
    ['an unquoted url in the head', '.c:not([x]):not(url(a)):not([y])'],
    ['a url token in a later member', ".c:not([x]),.d:not(url(a'b))"],
    ['an unquoted url in a skipped member', '.c:not([x]),.d:not(url(a))'],
    ['an escaped url spelling in the head', ".c:not([x]):not(\\75rl(a'b))"],
    ['a quoted url in the head', '.c:not([x]):not(url("a)"))'],
    ['a quoted url in a skipped member', '.d:not(url("a")),.c:not([x])'],
    [
      'groups nested past the depth limit',
      '.c:not([x]):not(' + '('.repeat(31) + ')'.repeat(31) + ')',
    ],
  ])('leaves the whole head unchanged for %s', (_name, selector) => {
    expect(wrapComponentNots(selector, '.c')).toBe(selector);
  });

  test.each([
    ['a longer class name', '.cx:not([a])'],
    ['a hyphenated class name', '.c-x:not([a])'],
    ['an underscored class name', '.c_x:not([a])'],
    ['a digit-ended class name', '.c1:not([a])'],
    ['an escaped class name', '.c\\31:not([a])'],
    ['a non-ASCII class name', '.cé:not([a])'],
    ['a tag head', 'div:not([x])'],
    ['no component head', ':not([x])'],
    ['a plugin prefix before the head', '.p .c:not([a])'],
    ['a plugin prefix joined to the head', '.p.c:not([a])'],
    ['a context compound before the head', '.dark:not(.x) .c'],
    ['a context compound before a :not on the head', '.dark:not(.x) .c:not([a])'],
    ['a descendant', '.c .x:not([a])'],
    ['a :not before a descendant', '.c:not([a]) .x'],
    ['a :not before a descendant :not', '.c:not([x]) .d:not([y])'],
    ['a :not before a child', '.c:not([a])>.x'],
    ['a :not before a spaced child combinator', '.c:not([a]) > *'],
    ['a :not before an adjacent sibling', '.c:not([a])+.x'],
    ['a :not before a general sibling', '.c:not([a]) ~ .c:not([b])'],
    ['an adjacent sibling that is the component', '.c:not(.a) + .c'],
    ['a pseudo-element before a descendant', '.c:not([a])::before .x'],
    ['a :not in the middle of a descendant chain', '.a .c:not([x]) .b'],
  ])('leaves %s unchanged', (_name, selector) => {
    expect(wrapComponentNots(selector, '.c')).toBe(selector);
  });

  test('leaves the head unchanged when the component has no head, as in global styles', () => {
    expect(wrapComponentNots('.x:not([y])', '')).toBe('.x:not([y])');
  });

  test('wraps only the own members of a list that mixes own and other members', () => {
    expect(
      wrapComponentNots('.c:not([a]) .x,.d:not([b]),.c:not([c]) ~ .y,.c:not([d])::after', '.c')
    ).toBe('.c:not([a]) .x,.d:not([b]),.c:not([c]) ~ .y,.c:where(:not([d]))::after');
  });

  test.each([
    ['a long list of own members', '.c:not([a]),'.repeat(20000) + '.c'],
    ['a long list of other members', '.d,'.repeat(40000) + '.c:not([a])'],
    ['a long list of other members that hold groups', '.d:not([a]),'.repeat(20000) + '.c:not([a])'],
    ['a long run of :not()', '.c' + ':not([a])'.repeat(20000)],
    ['a long run of :not() before a combinator', '.c' + ':not([a])'.repeat(20000) + ' .d'],
    ['a long head of unclosed groups', '.c' + ':not(['.repeat(20000)],
    ['deeply nested parens', '.c:not(' + '('.repeat(40000)],
    ['deeply nested closed parens', '.c:not(' + '('.repeat(40000) + ')'.repeat(40001)],
    ['deeply nested brackets', '.c:not([x]):not(' + '[('.repeat(20000)],
    ['a long string', '.c:not([x="' + 'a)'.repeat(40000) + '"])'],
    ['a long run of escapes', '.c:not([x]):not(.a' + '\\)'.repeat(40000)],
    ['a long url-like tail', '.c:not([x]):not(url(' + "a'".repeat(20000)],
    [
      'a long run of heads that start like the component',
      '.c.c.c.c,'.repeat(10000) + '.c:not([a])',
    ],
    ['a long head', '.c' + 'a'.repeat(40000) + ':not([a])'],
  ])('scans %s within a wall-clock budget', (_name, selector) => {
    const t0 = Date.now();
    wrapComponentNots(selector, '.c');

    expect(Date.now() - t0).toBeLessThan(SCAN_BUDGET_MS);
  });

  test('scans a head that repeats a long component head within a wall-clock budget', () => {
    const head = '.' + 'a'.repeat(2000);
    const t0 = Date.now();
    wrapComponentNots((head + 'b,').repeat(2000) + head + ':not([a])', head);

    expect(Date.now() - t0).toBeLessThan(SCAN_BUDGET_MS);
  });
});

/*
 * Selectors Level 4 (https://drafts.csswg.org/selectors-4/), quoted from the editor's draft.
 *
 * 12.1.1 The :enabled and :disabled Pseudo-classes
 *   "The :enabled pseudo-class represents user interface elements that are in an enabled state;
 *   such elements must have a corresponding disabled state. Conversely, the :disabled
 *   pseudo-class represents user interface elements that are in a disabled state; such elements
 *   must have a corresponding enabled state."
 *   "What constitutes an enabled state, a disabled state, and a user interface element is
 *   host-language-dependent."
 *
 * 15 Calculating a selector's specificity
 *   "The specificity of an :is(), :not(), or :has() pseudo-class is replaced by the specificity of
 *   the most specific complex selector in its selector list argument."
 *
 * So `:is(:disabled,[aria-disabled=true])` weighs (0,1,0), as `:disabled` does, and
 * `:not(:is(:disabled,[aria-disabled=true]))` weighs (0,1,0), as `:not(:disabled)` does.
 */
describe('rewriteDisabledTokens', () => {
  const ANY_DISABLED = ':is(:disabled,[aria-disabled=true])';

  test.each([
    ['.c:disabled', '.c' + ANY_DISABLED],
    ['.c:enabled', '.c:not(' + ANY_DISABLED + ')'],
    ['.a:disabled,.b:enabled', '.a' + ANY_DISABLED + ',.b:not(' + ANY_DISABLED + ')'],
    ['.c:disabled:disabled', '.c' + ANY_DISABLED + ANY_DISABLED],
    ['.c:has(:disabled)', '.c:has(' + ANY_DISABLED + ')'],
    ['.c:is(:enabled)', '.c:is(:not(' + ANY_DISABLED + '))'],
    ['.c:not(:disabled)', '.c:not(' + ANY_DISABLED + ')'],
    ['.c::slotted(:disabled)', '.c::slotted(' + ANY_DISABLED + ')'],
    [':host(:disabled)', ':host(' + ANY_DISABLED + ')'],
    [':host-context(:enabled)', ':host-context(:not(' + ANY_DISABLED + '))'],
    ['.c:nth-child(2 of :disabled)', '.c:nth-child(2 of ' + ANY_DISABLED + ')'],
    ['.a\\\\:disabled', '.a\\\\' + ANY_DISABLED],
    ['input:DISABLED', 'input' + ANY_DISABLED],
    [':Enabled', ':not(' + ANY_DISABLED + ')'],
    ['.c:disabled::before', '.c' + ANY_DISABLED + '::before'],
    ['.c:disabled:hover', '.c' + ANY_DISABLED + ':hover'],
    ['.c:disabled .d:enabled', '.c' + ANY_DISABLED + ' .d:not(' + ANY_DISABLED + ')'],
    ['.c[data-x=":enabled"]:disabled', '.c[data-x=":enabled"]' + ANY_DISABLED],
    ['.c:is("a\n:disabled")', '.c:is("a\n' + ANY_DISABLED + '")'],
    ['.c::part(x):disabled', '.c::part(x)' + ANY_DISABLED],
    [':disabled', ANY_DISABLED],
  ])('rewrites %j', (input, expected) => {
    expect(rewriteDisabledTokens(input)).toBe(expected);
  });

  test.each([
    '.x\\:disabled',
    '.x\\:enabled',
    '::disabled',
    '::enabled',
    '[title=":disabled"]',
    "[data-x=':enabled']",
    ':disabled-foo',
    ':disabled_x',
    ':enabledx',
    ':disabled9',
    ':disabledé',
    ':disabled\\-x',
    ':dis\\61 bled',
    ':disable',
    '.c[x=":disabled',
    '.c:hover',
    '.c[x]:not(.y)',
    '',
  ])('leaves %j as the same string', input => {
    expect(rewriteDisabledTokens(input)).toBe(input);
  });

  test.each([
    ['a long run of tokens', ':disabled'.repeat(20000)],
    ['a long run of escapes', '\\'.repeat(40000) + ':disabled'],
    ['a long run of near misses', ':disabledx'.repeat(20000)],
    ['a long run of open strings', '"'.repeat(40000) + ':disabled'],
    ['a long run of open brackets', '['.repeat(40000) + ':disabled'],
    ['a long run of colons', ':'.repeat(40000) + 'disabled'],
    ['a long string holding tokens', '[x="' + ':enabled'.repeat(10000) + '"]:enabled'],
  ])('scans %s within a wall-clock budget', (_name, input) => {
    const t0 = Date.now();
    rewriteDisabledTokens(input);

    expect(Date.now() - t0).toBeLessThan(SCAN_BUDGET_MS);
  });
});

/*
 * CSS Box Alignment 3 (https://drafts.csswg.org/css-align-3/), quoted from the editor's draft.
 *
 * 5.1.1 Block Containers (Including Table Cells)
 *   "For table cells, the behavior of align-content: normal depends on the computed value of
 *   vertical-align: top makes it behave as start and bottom makes it behave as end; otherwise
 *   middle makes it behave as center, and all other values make it behave as baseline."
 *   "All values other than normal force the block container to establish an independent
 *   formatting context."
 *
 * CSS Inline Layout 3 (https://drafts.csswg.org/css-inline-3/), quoted from the editor's draft.
 *
 * 4.2 Transverse Box Alignment: the vertical-align property
 *   "Value: [ first | last] || <'alignment-baseline'> || <'baseline-shift'>"
 *   "Note: vertical-align can also affect the alignment of table cells when align-content is
 *   normal. Specifically, top (baseline-shift: top) maps it to start, bottom (baseline-shift:
 *   bottom) to end, and otherwise middle (alignment-baseline: middle) to center."
 *
 * So `top | middle | bottom` map to `start | center | end` on the block axis of a block container,
 * and every other `vertical-align` maps to `normal`, which lets a later rule on the same element
 * undo an earlier mapping. `inherit` and a `var()` value are known only at runtime, so they map
 * to nothing and the browser keeps what the cascade holds.
 */
describe('alignContentFor', () => {
  test.each([
    ['top', 'start'],
    ['middle', 'center'],
    ['bottom', 'end'],
    ['TOP', 'start'],
    ['Middle', 'center'],
    ['BoTtOm', 'end'],
    ['  top ', 'start'],
    ['\tmiddle\n', 'center'],
  ])('maps vertical-align: %j to %s', (value, expected) => {
    expect(alignContentFor('vertical-align', value)).toBe(expected);
  });

  test.each([
    ['top !important', 'start !important'],
    ['top!important', 'start !important'],
    ['top ! important', 'start !important'],
    ['top !IMPORTANT', 'start !important'],
    ['  middle   !Important  ', 'center !important'],
    ['bottom !important', 'end !important'],
    ['baseline !important', 'normal !important'],
    ['sub!important', 'normal !important'],
  ])('carries the priority of %j over as %j', (value, expected) => {
    expect(alignContentFor('vertical-align', value)).toBe(expected);
  });

  test.each([
    'baseline',
    'sub',
    'super',
    'text-top',
    'text-bottom',
    'center',
    '0.5em',
    '10%',
    'initial',
    'unset',
    'revert',
    'revert-layer',
    'first top',
    'last baseline',
    'topx',
    'toppings',
    'important',
  ])('maps vertical-align: %j to normal', value => {
    expect(alignContentFor('vertical-align', value)).toBe('normal');
  });

  test.each([
    'inherit',
    'INHERIT',
    'inherit !important',
    'var(--v)',
    'VAR(--v, top)',
    'top var(--x)',
    'calc(var(--x) * 1px)',
  ])('maps vertical-align: %j to nothing', value => {
    expect(alignContentFor('vertical-align', value)).toBeUndefined();
  });

  test.each([
    ['vertical-align', 'start'],
    ['VERTICAL-ALIGN', 'start'],
    ['Vertical-Align', 'start'],
    ['align-content', undefined],
    ['vertical-aligx', undefined],
    ['vertical-align-x', undefined],
    ['verticalalign', undefined],
    ['display', undefined],
    ['', undefined],
  ])('reads the property %j as %s', (prop, expected) => {
    expect(alignContentFor(prop, 'top')).toBe(expected);
  });

  test.each([
    ['a long run of space around the keyword', ' '.repeat(100000) + 'top' + ' '.repeat(100000)],
    ['a long run of space before the priority', 'top' + ' '.repeat(100000) + '!important'],
    ['a long run of bangs', '!'.repeat(100000) + 'important'],
    ['a long run of near-miss priorities', ('! important'.repeat(20000) + 'x').trim()],
  ])('scans %s within a wall-clock budget', (_name, value) => {
    const t0 = Date.now();
    alignContentFor('vertical-align', value);

    expect(Date.now() - t0).toBeLessThan(SCAN_BUDGET_MS);
  });
});
