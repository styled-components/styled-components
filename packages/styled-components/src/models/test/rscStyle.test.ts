/**
 * @jest-environment node
 */

jest.mock('../../utils/isRsc', () => ({ IS_RSC: true }));

import { groupForId } from '../../sheet/GroupIDAllocator';
import styled from '../../index';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../../utils/createWarnTooManyClasses';
import { rememberRscRules } from '../../utils/rscCache';
import { mainCompiler, mainSheet } from '../StyleSheetManager';
import { rscChain, rscFlush, rscKeyframes } from '../rscStyle';

const optionsFor = (webStyle: ReturnType<typeof styled.div>['webStyle']) => {
  const context = { theme: {} };

  return {
    context,
    generated: rscFlush(webStyle, context, mainSheet, mainCompiler),
    ssc: { compiler: mainCompiler, styleSheet: mainSheet },
    webStyle,
  };
};

describe('rscChain', () => {
  const Base = styled.div`
    display: flex;
  `;
  const Extended = styled(Base)`
    color: red;
  `;

  it('lists the base level before the extension, each with its component and definition order', () => {
    const options = optionsFor(Extended.webStyle);
    const [base, extension] = options.generated.levels;

    expect(rscChain(options)).toEqual([
      [
        Base.webStyle.componentId,
        base.name,
        ['.' + base.name + '{display:flex;}'],
        groupForId(Base.webStyle.componentId),
      ],
      [
        Extended.webStyle.componentId,
        extension.name,
        ['.' + extension.name + '{color:red;}'],
        groupForId(Extended.webStyle.componentId),
      ],
    ]);
  });

  it('carries the rules of a name an earlier instance claimed, whose own render arrives empty', () => {
    const first = rscChain(optionsFor(Extended.webStyle));
    const second = optionsFor(Extended.webStyle);

    expect(second.generated.levels.map(level => level.rules)).toEqual([[], []]);
    expect(rscChain(second)).toEqual(first);
  });

  it('compiles an evicted chain again once, not once per level', () => {
    const options = optionsFor(Extended.webStyle);
    const expected = rscChain(options);
    const generate = jest.spyOn(Extended.webStyle, 'generate');

    for (let i = 0; i < TOO_MANY_CLASSES_LIMIT + 5; i++) {
      rememberRscRules(Base.webStyle, 'other' + i, []);
      rememberRscRules(Extended.webStyle, 'other' + i, []);
    }

    const emptied = {
      ...options,
      generated: {
        ...options.generated,
        levels: options.generated.levels.map(level => ({ ...level, rules: [] })),
      },
    };

    expect(rscChain(emptied)).toEqual(expected);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('leaves out a level with no rules', () => {
    const Empty = styled(Base)``;
    const chain = rscChain(optionsFor(Empty.webStyle));

    expect(chain.map(level => level[0])).toEqual([Base.webStyle.componentId]);
  });
});

describe('rscKeyframes', () => {
  it('lists each keyframes name once, in order of first use', () => {
    expect(
      rscKeyframes([
        { id: 'a', name: 'spin', rules: ['@keyframes spin{}'] },
        { id: 'b', name: 'fade', rules: ['@keyframes fade{}'] },
        { id: 'a', name: 'spin', rules: ['@keyframes spin{}'] },
      ])
    ).toEqual([
      ['a', 'spin', ['@keyframes spin{}']],
      ['b', 'fade', ['@keyframes fade{}']],
    ]);
  });
});
