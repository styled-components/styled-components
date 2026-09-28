/**
 * Style work of one render of a templated component: evaluate the slots, look
 * up or build the class, and write new rules (`WebStyle.flush`). No React.
 *
 * - warm: the component alternates between two prop sets whose classes are
 *   already cached, the steady state of a re-rendering app.
 * - cold: a new component's first render, template parse included (a fresh
 *   strings array each iteration), rule writing excluded (`generate` only).
 *
 * The component mixes value slots, a `${kf}` reference, an inline arrow css
 * fragment, a style object returned by a function, and nested `&` rules; each
 * shape also runs alone so a regression names its cause.
 *
 * Runs with `__DEV__` off, as a production bundle does.
 *
 * Run: pnpm --filter styled-components bench:web -- templated-render
 */

import css from '../constructors/css';
import keyframes from '../constructors/keyframes';
import { mainCompiler } from '../models/StyleSheetManager';
import WebStyle from '../models/WebStyle';
import StyleSheet from '../sheet';
import type { RuleSet } from '../types';
import { bench as _bench } from './bench-utils';

const opts = { runs: 7, precision: 2, nameWidth: 50 };
const bench = (name: string, iterations: number, fn: (i: number) => void) =>
  _bench(name, iterations, fn, opts);

interface Props {
  $bg: string;
  $color: string;
  $gap: number;
  $ms: number;
  $on: boolean;
  theme: object;
}

const PROPS: Props[] = [
  { $bg: '#fff', $color: 'red', $gap: 4, $ms: 100, $on: true, theme: {} },
  { $bg: '#000', $color: 'blue', $gap: 8, $ms: 200, $on: true, theme: {} },
];

const fade = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const valueSlots = () => css<Props>`
  color: ${p => p.$color};
  background: ${p => p.$bg};
  padding: ${p => p.$gap}px;
  margin: ${p => p.$gap * 2}px;
  transition-duration: ${p => p.$ms}ms;
`;

const keyframesRef = () => css<Props>`
  animation: ${fade} ${p => p.$ms}ms linear;
  color: ${p => p.$color};
`;

const arrowFragment = () => css<Props>`
  display: block;
  ${p => p.$on && css`color: ${p.$color}; background: ${p.$bg};`}
  padding: ${p => p.$gap}px;
`;

const styleObject = () => css<Props>`
  display: block;
  ${p => ({ borderColor: p.$color, padding: p.$gap + 'px' })}
`;

const nestedRules = () => css<Props>`
  display: flex;
  &:hover { color: ${p => p.$color}; }
  & > span { margin: ${p => p.$gap}px; }
`;

/** Every shape at once; a fresh strings array per call when `fresh` is set. */
function kitchen(fresh: boolean): RuleSet<Props> {
  const strings = fresh ? Object.assign(KITCHEN.slice(), { raw: KITCHEN.raw }) : KITCHEN;
  return css<Props>(
    strings,
    p => p.$color,
    p => p.$gap,
    fade,
    p => p.$ms,
    p => p.$on && css`color: ${p.$color}; background: ${p.$bg};`,
    p => ({ borderColor: p.$color, margin: p.$gap + 'px' }),
    p => p.$color,
    p => p.$gap
  );
}

const KITCHEN = ((strings: TemplateStringsArray) => strings)`
  display: flex;
  color: ${0};
  padding: ${0}px;
  animation: ${0} ${0}ms linear;
  ${0}
  ${0}
  &:hover { color: ${0}; }
  & > span { margin: ${0}px; }
`;

const SHAPES: Array<[string, () => RuleSet<Props>]> = [
  ['value slots', valueSlots],
  ['${kf} reference', keyframesRef],
  ['inline arrow css fragment', arrowFragment],
  ['style object from a function', styleObject],
  ['nested & rules', nestedRules],
  ['all shapes', () => kitchen(false)],
];

let componentCount = 0;
let sink = '';

function warm(rules: RuleSet<Props>): (i: number) => void {
  const style = new WebStyle(rules, 'sc-bench-warm-' + componentCount++);
  const sheet = new StyleSheet({ isServer: true });
  style.flush(PROPS[0], sheet, mainCompiler);
  style.flush(PROPS[1], sheet, mainCompiler);
  return i => {
    sink = style.flush(PROPS[i & 1], sheet, mainCompiler);
  };
}

function cold(make: () => RuleSet<Props>): (i: number) => void {
  return i => {
    const style = new WebStyle(make(), 'sc-bench-cold');
    sink = style.generate(PROPS[i & 1], new StyleSheet({ isServer: true }), mainCompiler).className;
  };
}

const globals = globalThis as { __DEV__?: boolean };
let dev: boolean | undefined;

beforeAll(() => {
  dev = globals.__DEV__;
  globals.__DEV__ = false;
});

afterAll(() => {
  globals.__DEV__ = dev;
});

describe('templated render', () => {
  it('warm renders', () => {
    console.log('\n--- warm render (cached classes, alternating props) ---');
    for (const [name, make] of SHAPES) bench(name, 100000, warm(make()));
  });

  it('cold renders', () => {
    console.log('\n--- cold render (first render, template parse included) ---');
    bench(
      'all shapes',
      10000,
      cold(() => kitchen(true))
    );
  });

  it('renders a class for every shape', () => {
    for (const [, make] of SHAPES) {
      sink = '';
      warm(make())(0);
      expect(sink).not.toBe('');
      sink = '';
      cold(make)(0);
      expect(sink).not.toBe('');
    }
  });
});
