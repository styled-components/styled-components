/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions": ["react-server", "node", "node-addons"]}
 */

// A client reference (a `'use client'` export) or a temporary reference (a value a server
// action received from the client) interpolated into a server component's styles has no class
// on the server and throws on almost any property read. The node holding it is dropped and
// nothing widens. Each row renders through the real Flight server with real references from
// react-server-dom-webpack. See docs/react.md "Client references in server styles".
import React from 'react';
import styled, {
  createGlobalStyle,
  css,
  type Interpolation,
  type Keyframes,
  keyframes,
} from '../../index';
import {
  clientComponent,
  clientModule,
  renderFlight,
  temporaryReference,
  type Probe,
} from '../../test/flight';
import {
  CLIENT_REFERENCE,
  isServerOpaqueReference,
  REFERENCE_MARKER,
  referenceText,
} from '../../utils/serverReference';
import { resetWarnOnce } from '../../utils/warnOnce';

/** The value a reference reaches a template as: the reference itself, or a function returning it. */
type Slot = Interpolation<object>;

/** A styled component rendering one element that takes `data-probe`. */
type Probed = React.ElementType;

type Row = {
  build: (slot: Slot) => Probed;
  /** The probe's style text with its class and component id as placeholders; null for no style tag. */
  css: string | null;
  name: string;
};

const clientWarning = (label: string): string =>
  `[sc] \`${label}\` is a 'use client' export, so a server component's styles cannot reference it, and the selector, at-rule, or declaration holding it was dropped. Define the styled component in a module without 'use client' so the server can read its class.`;

const TEMPORARY_WARNING =
  "[sc] A value a server action received from the client was interpolated into a server component's styles; the selector, at-rule, or declaration holding it was dropped. Interpolate values the server owns.";

const warnings: string[] = [];

beforeEach(() => {
  warnings.length = 0;
  resetWarnOnce();
  jest.spyOn(console, 'warn').mockImplementation((message: unknown) => {
    warnings.push(String(message));
  });
});

/** A reference is opaque to the test, as it is to the library: it only travels. */
const asSlot = (reference: unknown): Slot => reference as Slot;

/** The same, where a style object or array holds the reference and `Slot` does not fit its type. */
const asValue = (reference: unknown): never => reference as never;

/** A reference in a box, because awaiting one reads `then`, which throws on a module export. */
type Boxed = { reference: unknown };

const SHAPES = [
  {
    // `registerClientReference` is what Next calls for a `'use client'` file's exports: a function.
    make: async (): Promise<Boxed> => ({ reference: clientComponent('Card') }),
    name: 'a registered client reference',
    warning: clientWarning('client/Card'),
  },
  {
    // An export of `createClientModuleProxy`: a function whose every property read throws.
    make: async (): Promise<Boxed> => ({ reference: clientModule('file:///card.js').ClientCard }),
    name: 'a client module export',
    warning: clientWarning('ClientCard'),
  },
  {
    // The module proxy itself: an object that mints a new reference for every property read.
    make: async (): Promise<Boxed> => ({ reference: clientModule('file:///card.js') }),
    name: 'a client module proxy object',
    warning: clientWarning('file:///card.js'),
  },
  {
    make: async (): Promise<Boxed> => ({ reference: await temporaryReference() }),
    name: 'a temporary reference',
    warning: TEMPORARY_WARNING,
  },
];

const FORMS = [
  { name: 'a direct slot', wrap: (reference: unknown): Slot => asSlot(reference) },
  {
    name: 'a function return',
    wrap:
      (reference: unknown): Slot =>
      () =>
        asSlot(reference),
  },
];

/**
 * The text of a probe's style tag with each generated class as `X` (`Y`, `Z` for an extension's
 * base levels) and each component id as `ID`, so a row states what it emits and not its hashes.
 * `null` when the element has no style tag.
 */
const shown = (probe: Probe | undefined): string | null => {
  if (probe === undefined || probe.css === null) return null;

  const tokens = probe.className.split(' ');
  const ids = tokens.filter(token => token.startsWith('sc-'));
  const classes = tokens.filter(token => !token.startsWith('sc-'));
  const names: [token: string, name: string][] = [
    ...ids.map((id, index): [string, string] => [id, ids.length === 1 ? 'ID' : `ID${index}`]),
    ...classes.map((token, index): [string, string] => [token, ['X', 'Y', 'Z'][index]]),
  ];

  return names.reduce(
    (text, [token, name]) => text.replace(new RegExp(`(?<![\\w-])${token}(?![\\w-])`, 'g'), name),
    probe.css
  );
};

/** Renders `Component` once; `probe` is undefined when the render produced no element. */
const render = async (Component: Probed) => {
  const result = await renderFlight(<Component data-probe="x" />);
  const probe: Probe | undefined = result.probes.x;

  return { errors: result.errors, probe, warnings: [...warnings] };
};

/** What a row asserts as a whole. */
const outcome = async (Component: Probed) => {
  const { errors, probe, warnings: seen } = await render(Component);

  return { css: shown(probe), errors, warnings: seen };
};

// Selectors Level 4 (https://drafts.csswg.org/selectors-4/), 4.1 Selector Lists:
//
//   "A comma-separated list of selectors represents the union of all elements selected by each of the individual selectors in the selector list."
//
// An item that holds a reference matches nothing, so the item is dropped and the rest of the
// list keeps selecting what it selected. That follows 16.1 <forgiving-selector-list>:
//
//   "Remove all failure items from selector list, and all items that are invalid selectors, then return a <selector-list> representing the remaining items in selector list."
//
// It deviates from 3.9 Invalid Selectors and Error Handling for a style rule, which reads
// "a selector list containing an invalid selector is invalid." and would drop the whole rule.
// A browser would drop it, but the author wrote a list for the other items too.
//
// A reference inside a forgiving list (`:is(${R}, a) &`) drops its whole item; the list is not
// narrowed to `:is(a) &`.
const ITEM_ROWS: Row[] = [
  {
    build: r => styled.div`
      color: blue;
      ${r}:hover &, &:focus {
        color: red;
      }
    `,
    css: '.X{color:blue;}.X:focus{color:red;}',
    name: 'drops "${R}:hover &" and keeps "&:focus"',
  },
  {
    build: r => styled.div`
      color: blue;
      a, ${r} {
        color: red;
      }
    `,
    css: '.X{color:blue;}.X a{color:red;}',
    name: 'drops "${R}" from "a, ${R}" and keeps "a"',
  },
  {
    build: r => styled.div`
      color: blue;
      :is(${r}, a) &, &:focus {
        color: red;
      }
    `,
    css: '.X{color:blue;}.X:focus{color:red;}',
    name: 'drops the whole item holding "${R}" inside ":is()" and keeps "&:focus"',
  },
  {
    build: r => styled.div`
      color: blue;
      & > :not(${r}), &:focus {
        color: red;
      }
    `,
    css: '.X{color:blue;}.X:focus{color:red;}',
    name: 'drops "& > :not(${R})" and keeps "&:focus"',
  },
  {
    build: r => styled.div`
      color: blue;
      &:has(${r}), &:focus {
        color: red;
      }
    `,
    css: '.X{color:blue;}.X:focus{color:red;}',
    name: 'drops "&:has(${R})" and keeps "&:focus"',
  },
  {
    build: r => styled.div`
      color: blue;
      & + ${r}, &:focus {
        color: red;
      }
    `,
    css: '.X{color:blue;}.X:focus{color:red;}',
    name: 'drops "& + ${R}" and keeps "&:focus"',
  },
  {
    build: r => styled.div`
      color: blue;
      @media print {
        ${r} &, &:focus {
          color: red;
        }
      }
    `,
    css: '.X{color:blue;}@media print{.X:focus{color:red;}}',
    name: 'keeps an at-rule around the item left in its rule',
  },
  {
    build: r => styled.div`
      color: blue;
      &:hover {
        color: red;
        ${r} & {
          top: 0;
        }
      }
    `,
    css: '.X{color:blue;}.X:hover{color:red;}',
    name: 'drops a nested rule and keeps its parent rule declarations',
  },
];

const RULE_ROWS: Row[] = [
  {
    build: r => styled.div`
      color: blue;
      ${r} & {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops the rule when "${R} &" is its only item',
  },
  {
    build: r => styled.div`
      ${r} & {
        color: red;
      }
    `,
    css: null,
    name: 'emits no style tag when everything the template wrote holds "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      ${r} {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops the rule when "${R}" is its only item',
  },
  {
    build: r => styled.div`
      color: blue;
      ${r}
      h2, h3 {
        color: red;
      }
    `,
    css: '.X{color:blue;}.X h3{color:red;}',
    name: 'drops only the item a standalone "${R}" joins into the head',
  },
  {
    build: r => styled.div`
      color: blue;
      ${r}
      ${'h1'} h2 {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops the rule when a standalone "${R}" and a value join into its only item',
  },
  {
    build: r => styled.div`
      color: blue;
      ${r}
      @media print {
        color: red;
      }
    `,
    css: '.X{color:blue;}@media print{.X{color:red;}}',
    name: 'keeps an at-rule after a standalone "${R}"',
  },
];

const AT_RULE_ROWS: Row[] = [
  {
    build: r => styled.div`
      color: blue;
      @container ${r} (min-width: 1px) {
        color: teal;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops an at-rule whose prelude holds "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      @media ${r} {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops an at-rule whose whole condition is "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      @${r} print {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops an at-rule named by "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      @import ${r};
    `,
    css: '.X{color:blue;}',
    name: 'drops a statement at-rule holding "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      @font-face {
        font-family: ${r};
        src: url(x);
      }
    `,
    css: '.X{color:blue;}@font-face{src:url(x);}',
    name: 'drops a declaration holding "${R}" inside a declaration at-rule and keeps the others',
  },
  {
    build: r => styled.div`
      color: blue;
      @media print {
        ${r} & {
          color: red;
        }
      }
    `,
    css: '.X{color:blue;}',
    name: 'omits an at-rule left empty',
  },
  {
    build: r => styled.div`
      color: blue;
      @media print {
        ${r} & {
          color: red;
        }
        color: teal;
      }
    `,
    css: '.X{color:blue;}@media print{.X{color:teal;}}',
    name: 'keeps the declarations beside a dropped rule in an at-rule',
  },
  {
    build: r => styled.div`
      color: blue;
      @keyframes x {
        to {
          content: "${r}";
          color: red;
        }
      }
    `,
    css: '.X{color:blue;}@keyframes x{to{color:red;}}',
    name: 'drops a keyframes declaration holding "${R}" and keeps the others',
  },
  {
    build: r => styled.div`
      color: blue;
      @keyframes ${r} {
        to {
          color: red;
        }
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops a keyframes block named by "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      @keyframes x {
        from, ${r} {
          color: red;
        }
        to {
          top: 0;
        }
      }
    `,
    css: '.X{color:blue;}@keyframes x{from{color:red;}to{top:0;}}',
    name: 'drops a keyframes stop holding "${R}" and keeps the others',
  },
];

const DECLARATION_ROWS: Row[] = [
  {
    build: r => styled.div`
      color: blue;
      --x: ${r};
      top: 0;
    `,
    css: '.X{color:blue;top:0;}',
    name: 'drops a custom property whose value is "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      content: "${r}";
      top: 0;
    `,
    css: '.X{color:blue;top:0;}',
    name: 'drops a declaration whose string holds "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      margin: 0 ${r} 1px;
      top: 0;
    `,
    css: '.X{color:blue;top:0;}',
    name: 'drops a declaration whose value holds "${R}" among other words',
  },
  {
    build: r => styled.div`
      color: blue;
      ${r}: red;
      top: 0;
    `,
    css: '.X{color:blue;top:0;}',
    name: 'drops a declaration whose property is "${R}"',
  },
  {
    build: r => styled.div`
      view-transition-name: card;
      view-transition-class: ${r};
    `,
    css: '.X{view-transition-name:card;view-transition-class:ID;}',
    name: 'treats a dropped "view-transition-class" as unwritten, so the automatic class applies',
  },
  {
    build: r => styled.div`
      container-type: size;
      container-name: ${r};
    `,
    css: '.X{container-type:size;container-name:ID;}',
    name: 'treats a dropped "container-name" as unwritten, so the automatic name applies',
  },
  {
    build: r => styled.div`
      color: blue;
      container: ${r} / inline-size;
    `,
    css: '.X{color:blue;}',
    name: 'drops "container: ${R} / inline-size", leaving no container',
  },
  {
    build: r => styled.div`
      color: blue;
      ${r};
    `,
    css: '.X{color:blue;}',
    name: 'emits nothing for a standalone "${R};"',
  },
  {
    build: r => styled.div`
      color: blue;
      ${r}
    `,
    css: '.X{color:blue;}',
    name: 'emits nothing for a standalone "${R}" at the end',
  },
];

const MIXIN_ROWS: Row[] = [
  {
    build: r => styled.div`
      color: blue;
      ${css`${r}`} & {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops the rule when a mixin holds the reference',
  },
  {
    build: r => styled.div`
      color: blue;
      ${css`${css`${r}`}`} & {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops the rule when a mixin in a mixin holds the reference',
  },
  {
    build: r => styled.div`
      color: blue;
      ${css`${() => asSlot(r)}`} & {
        color: red;
      }
    `,
    css: '.X{color:blue;}',
    name: 'drops the rule when a mixin function returns the reference',
  },
  {
    build: r => styled.div`
      ${css`
        color: red;
        ${r} & {
          top: 0;
        }
      `}
      left: 0;
    `,
    css: '.X{color:red;left:0;}',
    name: 'keeps the declarations of a mixin whose rule holds "${R}"',
  },
];

const VALUE_ROWS: Row[] = [
  {
    build: r => styled.div`
      left: 1px;
      ${() => ({ color: asValue(r), top: 0 })}
    `,
    css: '.X{left:1px;top:0;}',
    name: 'drops the declaration of a returned style object that holds "${R}"',
  },
  {
    build: r => styled.div`
      color: blue;
      ${css({ '&:hover': { color: 'red', content: asValue(r) } })}
    `,
    css: '.X{color:blue;}.X:hover{color:red;}',
    name: 'drops the declaration of a "css()" style object that holds "${R}"',
  },
  {
    build: r =>
      styled.div({
        '&:hover': { color: 'red', content: asValue(r) },
        color: 'blue',
      }),
    css: '.X{color:blue;}.X:hover{color:red;}',
    name: 'drops the declaration of a "styled.div()" style object that holds "${R}"',
  },
  {
    build: r => styled.div`
      top: 0;
      ${() => ['color: red;', asValue(r)]}
    `,
    css: '.X{top:0;color:red;}',
    name: 'keeps the text beside "${R}" in a returned array',
  },
  {
    build: r => styled.div`
      color: blue;
      ${[asValue(r)]}
    `,
    css: '.X{color:blue;}',
    name: 'emits nothing for an array holding only "${R}"',
  },
];

/** Where a node holds the reference. The drop pass reads text, not the shape, so one shape covers each. */
const POSITION_GROUPS = [
  ['a selector-list item', ITEM_ROWS],
  ['a rule', RULE_ROWS],
  ['an at-rule or keyframes', AT_RULE_ROWS],
  ['a declaration', DECLARATION_ROWS],
] as const;

/** Rows where the shape decides how the reference travels (a mixin, a style object, an array). */
const SHAPE_GROUPS = [
  ['a mixin', MIXIN_ROWS],
  ['a style object or array', VALUE_ROWS],
] as const;

describe.each(SHAPES)('$name interpolated into a server component', shape => {
  const groups = shape === SHAPES[0] ? [...POSITION_GROUPS, ...SHAPE_GROUPS] : SHAPE_GROUPS;

  describe.each(FORMS)('as $name', form => {
    describe.each(groups)('drops %s', (_group, rows) => {
      test.each(rows)('$name', async row => {
        const { reference } = await shape.make();

        expect(await outcome(row.build(form.wrap(reference)))).toEqual({
          css: row.css,
          errors: [],
          warnings: [shape.warning],
        });
      });
    });

    describe('across components and renders', () => {
      test('keeps the styles of a base component that holds it, under an extension', async () => {
        const { reference } = await shape.make();
        const slot = form.wrap(reference);
        const Base = styled.div`
          color: blue;
          ${slot} & {
            color: red;
          }
        `;
        const Extended = styled(Base)`
          top: 0;
        `;

        expect(await outcome(Extended)).toEqual({
          css: ':where(.X){color:blue;}.Y{top:0;}',
          errors: [],
          warnings: [shape.warning],
        });
      });

      test('keeps the styles of an extension that holds it, over its base', async () => {
        const { reference } = await shape.make();
        const slot = form.wrap(reference);
        const Base = styled.div`
          color: blue;
        `;
        const Extended = styled(Base)`
          top: 0;
          ${slot} & {
            color: red;
          }
        `;

        expect(await outcome(Extended)).toEqual({
          css: ':where(.X){color:blue;}.Y{top:0;}',
          errors: [],
          warnings: [shape.warning],
        });
      });

      test('gives each render its own class, as the reference is or is not interpolated', async () => {
        const { reference } = await shape.make();
        const slot = form.wrap(reference);
        const Toggle = styled.div<{ $on: boolean }>`
          color: blue;
          ${p => (p.$on ? slot : '')} & {
            color: red;
          }
        `;

        const result = await renderFlight(
          <>
            <Toggle $on data-probe="on" />
            <Toggle $on={false} data-probe="off" />
          </>
        );
        const on: Probe | undefined = result.probes.on;
        const off: Probe | undefined = result.probes.off;

        expect({
          css: [shown(on), shown(off)],
          distinctClasses: on?.className !== off?.className,
          errors: result.errors,
          warnings,
        }).toEqual({
          css: ['.X{color:blue;}', '.X{color:blue;}.X{color:red;}'],
          distinctClasses: true,
          errors: [],
          warnings: [shape.warning],
        });
      });

      test('still evaluates a function slot inside the node it drops', async () => {
        const { reference } = await shape.make();
        const slot = form.wrap(reference);
        const color = jest.fn(() => 'red');
        const Dropped = styled.div`
          color: blue;
          ${slot} & {
            color: ${color};
          }
        `;

        expect(await outcome(Dropped)).toEqual({
          css: '.X{color:blue;}',
          errors: [],
          warnings: [shape.warning],
        });
        expect(color).toHaveBeenCalledTimes(1);
      });

      test('reads an earlier declaration for "ast.peek" when the later one holds it', async () => {
        const { reference } = await shape.make();
        const slot = form.wrap(reference);
        const Colored = styled.div.attrs<{ 'data-color'?: string | undefined }>((_p, ast) => ({
          'data-color': ast.peek('color'),
        }))`
          color: blue;
          color: ${slot};
        `;
        const { errors, probe, warnings: seen } = await render(Colored);

        expect({
          color: probe?.props['data-color'],
          css: shown(probe),
          errors,
          warnings: seen,
        }).toEqual({
          color: 'blue',
          css: '.X{color:blue;}',
          errors: [],
          warnings: [shape.warning],
        });
      });

      test('reads the base component declaration for "ast.peek" when the extension holds it', async () => {
        const { reference } = await shape.make();
        const slot = form.wrap(reference);
        const Base = styled.div`
          color: blue;
        `;
        const Extended = styled(Base).attrs<{ 'data-color'?: string | undefined }>((_p, ast) => ({
          'data-color': ast.peek('color'),
        }))`
          color: ${slot};
        `;
        const { errors, probe, warnings: seen } = await render(Extended);

        expect({
          color: probe?.props['data-color'],
          css: shown(probe),
          errors,
          warnings: seen,
        }).toEqual({
          color: 'blue',
          css: ':where(.X){color:blue;}',
          errors: [],
          warnings: [shape.warning],
        });
      });
    });

    describe('in createGlobalStyle', () => {
      test('drops the rules and items that hold it and keeps the rest', async () => {
        const { reference } = await shape.make();
        const slot = form.wrap(reference);
        const Global = createGlobalStyle`
          body {
            color: blue;
          }
          ::view-transition-group(*${slot}) {
            animation: none;
          }
          ${slot} {
            top: 0;
          }
        `;
        const result = await renderFlight(<Global />);

        expect({ errors: result.errors, globals: result.globals, warnings }).toEqual({
          errors: [],
          globals: ['body{color:blue;}'],
          warnings: [shape.warning],
        });
      });
    });
  });
});

describe.each([SHAPES[0], SHAPES[3]])('$name interpolated into a standalone keyframes', shape => {
  const compiled = async (build: (reference: Slot) => Keyframes) => {
    const { reference } = await shape.make();
    const frames = build(asSlot(reference));

    return { name: frames.name, rules: frames.compile().rules };
  };

  test('drops a declaration holding it and keeps the others', async () => {
    const { name, rules } = await compiled(
      r => keyframes`
        from {
          content: "${r}";
          color: red;
        }
        to {
          top: 0;
        }
      `
    );

    expect({ rules, warnings }).toEqual({
      rules: [`@keyframes ${name}{from{color:red;}to{top:0;}}`],
      warnings: [shape.warning],
    });
  });

  test('drops a stop holding it and keeps the others', async () => {
    const { name, rules } = await compiled(
      r => keyframes`
        from, ${r} {
          color: red;
        }
        to {
          top: 0;
        }
      `
    );

    expect({ rules, warnings }).toEqual({
      rules: [`@keyframes ${name}{from{color:red;}to{top:0;}}`],
      warnings: [shape.warning],
    });
  });

  test('drops a declaration holding it inside a css fragment and keeps the others', async () => {
    const { name, rules } = await compiled(
      r => keyframes`
        ${css`
          from {
            content: "${r}";
            color: red;
          }
        `}
        to {
          top: 0;
        }
      `
    );

    expect({ rules, warnings }).toEqual({
      rules: [`@keyframes ${name}{from{color:red;}to{top:0;}}`],
      warnings: [shape.warning],
    });
  });

  test('drops a declaration holding it inside a fragment within a fragment', async () => {
    const { name, rules } = await compiled(
      r => keyframes`
        ${css`
          from {
            ${css`
              content: "${r}";
              color: red;
            `}
          }
        `}
        to {
          top: 0;
        }
      `
    );

    expect({ rules, warnings }).toEqual({
      rules: [`@keyframes ${name}{from{color:red;}to{top:0;}}`],
      warnings: [shape.warning],
    });
  });

  test('keeps the same name for the same template', async () => {
    const build = (r: Slot) => keyframes`
      from {
        content: "${r}";
      }
    `;
    const first = await compiled(build);
    const second = await compiled(build);

    expect(first.name).toBe(second.name);
  });
});

describe('recognizing a reference', () => {
  /** A function carrying a reference's tag the way a wrapper that copied one would. */
  const tagged = (tag: symbol, extra: object = {}) =>
    Object.assign(() => undefined, { $$typeof: tag }, extra);

  test.each(SHAPES)('accepts $name', async shape => {
    const { reference } = await shape.make();

    expect(isServerOpaqueReference(reference)).toBe(true);
  });

  test.each([
    ['a string', 'a'],
    ['null', null],
    ['undefined', undefined],
    ['a plain object', {}],
    ['a plain function', () => undefined],
    ['a function tagged as a forwardRef', tagged(Symbol.for('react.forward_ref'))],
    [
      'a styled component that carries a client reference tag',
      tagged(CLIENT_REFERENCE, { styledComponentId: 'sc-x' }),
    ],
  ])('rejects %s', (_name, value) => {
    expect(isServerOpaqueReference(value)).toBe(false);
  });

  test('reads a styled component that carries a client reference tag as its class selector', async () => {
    const Wrapped = tagged(CLIENT_REFERENCE, { styledComponentId: 'sc-wrapped' });
    const Host = styled.div`
      color: blue;
      ${asSlot(Wrapped)}:hover & {
        color: red;
      }
    `;

    expect(await outcome(Host)).toEqual({
      css: '.X{color:blue;}.sc-wrapped:hover .X{color:red;}',
      errors: [],
      warnings: [],
    });
  });

  test.each([
    ['the export name after "#" in its id', { $$id: 'file:///a.js#Card' }, 'Card'],
    [
      'the module id when the export is named "default"',
      { $$id: 'file:///a.js#default' },
      'file:///a.js',
    ],
    ['its whole id when there is no export name', { $$id: 'file:///a.js' }, 'file:///a.js'],
    ['its name when the id has no export name', { $$id: 'file:///a.js#', name: 'Card' }, 'Card'],
    ['"unknown" when it has neither', {}, 'unknown'],
  ])('labels a client reference by %s', (_name, fields, label) => {
    expect(referenceText({ $$typeof: CLIENT_REFERENCE, ...fields })).toBe(REFERENCE_MARKER);
    expect(warnings).toEqual([clientWarning(label)]);
  });

  test('warns once per label', () => {
    const card = { $$id: 'file:///a.js#Card', $$typeof: CLIENT_REFERENCE };
    const menu = { $$id: 'file:///a.js#Menu', $$typeof: CLIENT_REFERENCE };

    [card, card, menu, card].forEach(referenceText);

    expect(warnings).toEqual([clientWarning('Card'), clientWarning('Menu')]);
  });
});

describe('a temporary reference a server action received', () => {
  const Valued = styled.div<{ $value: unknown }>`
    color: blue;
    ${p => p.$value as never} & {
      color: red;
    }
  `;

  test('is dropped when it reaches a module-level component through a prop', async () => {
    const result = await renderFlight(
      <Valued $value={await temporaryReference()} data-probe="x" />
    );
    const probe: Probe | undefined = result.probes.x;

    expect({ css: shown(probe), errors: result.errors, warnings }).toEqual({
      css: '.X{color:blue;}',
      errors: [],
      warnings: [TEMPORARY_WARNING],
    });
  });
});
