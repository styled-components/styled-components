/**
 * @jest-environment node
 */

jest.mock('../../utils/isRsc', () => ({ IS_RSC: true }));

import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../../utils/createWarnTooManyClasses';
import generateComponentId from '../../utils/generateComponentId';
import { stripSplitter } from '../../utils/joinStrings';
import { rememberRscRules } from '../../utils/rscCache';
import type { RscLevel, RscRequestState } from '../../utils/rscCache';
import { groupForId, resetGroupIds } from '../../sheet/GroupIDAllocator';
import styled from '../../index';
import { mainCompiler, mainSheet } from '../StyleSheetManager';
import {
  absorbRscWrappers,
  buildRscFoldedCss,
  buildRscStyleCss,
  recordRscWrapper,
  retarget,
  rscAbsorbed,
  rscFlush,
  rscFoldedName,
} from '../rscStyle';

const level = (name: string, group: number, order: number, body = 'x:y;'): RscLevel => ({
  css: `.${name}{${body}}`,
  group,
  name,
  order,
});

const requestState = (): RscRequestState => ({
  absorbed: new Map(),
  emitCounts: null,
  styleElements: new Map(),
  wrappers: new Map(),
});

describe('absorbRscWrappers', () => {
  const wrappers = new Map<string, RscLevel[]>([
    ['w1', [level('a', 0, 0)]],
    ['w2', [level('b', 0, 1), level('c', 0, 1)]],
  ]);

  it('returns null when the class list names no recorded wrapper', () => {
    expect(absorbRscWrappers(wrappers, 'x y')).toBeNull();
  });

  it('returns null for an empty class list', () => {
    expect(absorbRscWrappers(wrappers, '')).toBeNull();
  });

  it('returns the levels, the wrapper names, and the other classes', () => {
    const absorbed = absorbRscWrappers(wrappers, 'x w1 y w2');

    expect(absorbed).toMatchObject({
      levels: [level('a', 0, 0), level('b', 0, 1), level('c', 0, 1)],
      names: ' w1 w2',
      rest: 'x y',
    });
  });

  it('drops the empty classes that repeated, leading and trailing spaces leave', () => {
    const absorbed = absorbRscWrappers(wrappers, '  x   w1 ');

    expect(absorbed?.names).toBe(' w1');
    expect(absorbed?.rest).toBe('x');
  });

  it('leaves no other classes when every class is a wrapper', () => {
    expect(absorbRscWrappers(wrappers, 'w1 w2')?.rest).toBe('');
  });

  it('lists a wrapper class that appears twice twice', () => {
    const absorbed = absorbRscWrappers(wrappers, 'w1 w1');

    expect(absorbed?.names).toBe(' w1 w1');
    expect(absorbed?.levels).toEqual([level('a', 0, 0), level('a', 0, 0)]);
  });
});

describe('rscFoldedName', () => {
  const wrappers = new Map<string, RscLevel[]>([['w1', [level('a', 0, 0)]]]);

  it('hashes the chain and the wrapper names together', () => {
    const absorbed = absorbRscWrappers(wrappers, 'w1');
    if (absorbed === null) throw new Error('expected the wrapper to be absorbed');

    expect(rscFoldedName('chain', absorbed)).toBe(generateComponentId('chain w1'));
  });

  it('names the class differently for another chain, and the same again for the same chain', () => {
    const absorbed = absorbRscWrappers(wrappers, 'w1');
    if (absorbed === null) throw new Error('expected the wrapper to be absorbed');

    expect(rscFoldedName('other', absorbed)).not.toBe(rscFoldedName('chain', absorbed));
    expect(rscFoldedName('chain', absorbed)).toBe(generateComponentId('chain w1'));
  });
});

describe('rscAbsorbed', () => {
  it('finds a wrapper recorded after the same class list was first seen without one', () => {
    const Box = styled.div`
      color: red;
    `;
    const context = { theme: {} };
    const state = requestState();

    expect(rscAbsorbed(state, 'later x')).toBeNull();

    recordRscWrapper(
      {
        chain: 'later',
        context,
        generated: rscFlush(Box.webStyle, context, mainSheet, mainCompiler),
        ssc: { compiler: mainCompiler, styleSheet: mainSheet },
        webStyle: Box.webStyle,
      },
      state
    );

    expect(rscAbsorbed(state, 'later x')).toMatchObject({ names: ' later', rest: 'x' });
  });

  it('remembers the answer for a class list until a wrapper is recorded', () => {
    const state = requestState();
    state.wrappers.set('w', [level('a', 0, 0)]);

    expect(rscAbsorbed(state, 'w x')).toBe(rscAbsorbed(state, 'w x'));
  });
});

describe('buildRscFoldedCss', () => {
  beforeEach(() => {
    resetGroupIds();
  });

  const Own = styled.div`
    color: red;
  `;

  /** Options for an element folded onto `chain`, whose own chain is one level named `own`, in the component `componentId`. */
  const optionsFor = (componentId: string, chain: string) => ({
    chain,
    context: { theme: {} },
    generated: {
      className: 'own',
      keyframes: [],
      levels: [{ componentId, isNew: true, name: 'own', rules: ['.own{c:3;}'] }],
    },
    ssc: { compiler: mainCompiler, styleSheet: mainSheet },
    webStyle: Own.webStyle,
  });

  it('lists levels by group, then by render order, with the own level last in its group', () => {
    const low = groupForId('low');
    const high = groupForId('high');
    const absorbed = absorbRscWrappers(
      new Map([
        ['w2', [level('w2', high, 1, 'b:2;')]],
        ['w3', [level('w3', low, 2, 'a:3;')]],
        ['w1', [level('w1', high, 0, 'b:1;')]],
      ]),
      'w2 w3 w1'
    );
    if (absorbed === null) throw new Error('expected the wrappers to be absorbed');

    expect(buildRscFoldedCss(optionsFor('high', 'f'), absorbed)).toBe(
      '.f{a:3;}.f{b:1;}.f{b:2;}.f{c:3;}'
    );
  });

  it('emits each level name once', () => {
    const group = groupForId('only');
    const absorbed = absorbRscWrappers(new Map([['w', [level('a', group, 0)]]]), 'w w');
    if (absorbed === null) throw new Error('expected the wrapper to be absorbed');

    expect(buildRscFoldedCss(optionsFor('only', 'f'), absorbed)).toBe('.f{x:y;}.f{c:3;}');
  });
});

describe('recordRscWrapper', () => {
  it('compiles an evicted chain again once, not once per level', () => {
    const Base = styled.div`
      display: flex;
    `;
    const Extended = styled(Base)`
      color: red;
    `;
    const context = { theme: {} };
    const flushed = rscFlush(Extended.webStyle, context, mainSheet, mainCompiler);
    const generate = jest.spyOn(Extended.webStyle, 'generate');

    for (let i = 0; i < TOO_MANY_CLASSES_LIMIT + 5; i++) {
      rememberRscRules(Base.webStyle, 'other' + i, []);
      rememberRscRules(Extended.webStyle, 'other' + i, []);
    }

    const state = requestState();
    recordRscWrapper(
      {
        chain: 'chain',
        context,
        generated: {
          ...flushed,
          levels: flushed.levels.map(l => ({ ...l, rules: [] })),
        },
        ssc: { compiler: mainCompiler, styleSheet: mainSheet },
        webStyle: Extended.webStyle,
      },
      state
    );

    expect(generate).toHaveBeenCalledTimes(1);
    expect(state.wrappers.get('chain')?.map(l => stripSplitter(l.css))).toEqual([
      `.${flushed.levels[0].name}{display:flex;}`,
      `.${flushed.levels[1].name}{color:red;}`,
    ]);

    generate.mockRestore();
  });

  it('gives a wrapper the same tag text from its recorded levels as from its chain', () => {
    const Base = styled.div`
      display: flex;
    `;
    const Extended = styled(Base)`
      color: red;
    `;
    const options = {
      chain: 'chain',
      context: { theme: {} },
      generated: rscFlush(Extended.webStyle, { theme: {} }, mainSheet, mainCompiler),
      ssc: { compiler: mainCompiler, styleSheet: mainSheet },
      webStyle: Extended.webStyle,
    };
    const state = requestState();
    recordRscWrapper(options, state);

    expect(buildRscStyleCss(options, state.wrappers.get('chain'))).toBe(
      `.chain{display:flex;}.chain{color:red;}`
    );
    expect(buildRscStyleCss(options)).toBe(`.chain{display:flex;}.chain{color:red;}`);
  });
});

describe('retarget', () => {
  it('swaps every class selector that is exactly the name', () => {
    expect(retarget('.ab{color:red;}.ab:hover,.ab>i{color:blue;}', 'ab', 'zz')).toBe(
      '.zz{color:red;}.zz:hover,.zz>i{color:blue;}'
    );
  });

  it.each([
    ['a letter', '.abc{color:red;}'],
    ['an uppercase letter', '.abC{color:red;}'],
    ['a digit', '.ab1{color:red;}'],
    ['a hyphen', '.ab-x{color:red;}'],
    ['an underscore', '.ab_x{color:red;}'],
  ])('leaves a longer class that starts with the name when %s follows', (_label, css) => {
    expect(retarget(css, 'ab', 'zz')).toBe(css);
  });

  it.each([
    ['a brace', '.ab{x:y;}', '.zz{x:y;}'],
    ['a comma', '.ab,.cd{x:y;}', '.zz,.cd{x:y;}'],
    ['a colon', '.ab:hover{x:y;}', '.zz:hover{x:y;}'],
    ['a bracket', '.ab[a]{x:y;}', '.zz[a]{x:y;}'],
    ['a space', '.ab .cd{x:y;}', '.zz .cd{x:y;}'],
    ['a dot', '.ab.ab{x:y;}', '.zz.zz{x:y;}'],
    ['a paren', ':is(.ab){x:y;}', ':is(.zz){x:y;}'],
    ['the end of the text', 'a .ab', 'a .zz'],
  ])('swaps the name when %s follows', (_label, css, expected) => {
    expect(retarget(css, 'ab', 'zz')).toBe(expected);
  });

  it('swaps a name after a longer class that starts with it', () => {
    expect(retarget('.abc{x:y;}.ab{x:y;}', 'ab', 'zz')).toBe('.abc{x:y;}.zz{x:y;}');
  });

  it('ignores a name with no leading dot', () => {
    expect(retarget('.x{content:"ab";}a-ab{}', 'ab', 'zz')).toBe('.x{content:"ab";}a-ab{}');
  });

  it('returns the text as it is when the name is absent', () => {
    expect(retarget('.cd{x:y;}', 'ab', 'zz')).toBe('.cd{x:y;}');
  });

  it('writes only the new name, whatever surrounds the old one', () => {
    expect(retarget('.x{background:url(.ab)}.ab{x:"}"}', 'ab', 'zz')).toBe(
      '.x{background:url(.zz)}.zz{x:"}"}'
    );
  });
});
