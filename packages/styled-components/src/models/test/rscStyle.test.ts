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

  it('carries the rules of a name an earlier instance claimed, recalled from the RSC cache', () => {
    const first = rscChain(optionsFor(Extended.webStyle));
    const second = optionsFor(Extended.webStyle);

    expect(second.generated.levels.map(level => level.rules)).toEqual([
      ['.' + second.generated.levels[0].name + '{display:flex;}'],
      ['.' + second.generated.levels[1].name + '{color:red;}'],
    ]);
    expect(rscChain(second)).toEqual(first);
  });

  it('re-emits evicted RSC rules without re-evaluating interpolations', () => {
    let baseCalls = 0;
    let extCalls = 0;
    const DynamicBase = styled.div`
      display: ${() => {
        baseCalls++;
        return 'flex';
      }};
    `;
    const DynamicExt = styled(DynamicBase)`
      color: ${() => {
        extCalls++;
        return 'red';
      }};
    `;

    const first = rscChain(optionsFor(DynamicExt.webStyle));
    expect(baseCalls).toBe(1);
    expect(extCalls).toBe(1);

    for (let i = 0; i < TOO_MANY_CLASSES_LIMIT + 5; i++) {
      rememberRscRules(DynamicBase.webStyle, 'other' + i, []);
      rememberRscRules(DynamicExt.webStyle, 'other' + i, []);
    }

    const second = rscChain(optionsFor(DynamicExt.webStyle));

    expect(second).toEqual(first);
    expect(baseCalls).toBe(2);
    expect(extCalls).toBe(2);
  });

  it('leaves out a trailing level with no rules', () => {
    const Empty = styled(Base)``;
    const chain = rscChain(optionsFor(Empty.webStyle));

    expect(chain.map(level => level[0])).toEqual([Base.webStyle.componentId]);
  });

  it('keeps empty preceding and intermediate levels so every inheritance pin stays intact', () => {
    const EmptyBase = styled.div``;
    const OverEmptyBase = styled(EmptyBase)`
      color: red;
    `;
    const EmptyMiddle = styled(Base)``;
    const OverEmptyMiddle = styled(EmptyMiddle)`
      color: blue;
    `;

    const twoLevel = rscChain(optionsFor(OverEmptyBase.webStyle));
    expect(twoLevel.map(([id, , rules]) => [id, rules.length > 0])).toEqual([
      [EmptyBase.webStyle.componentId, false],
      [OverEmptyBase.webStyle.componentId, true],
    ]);

    const threeLevel = rscChain(optionsFor(OverEmptyMiddle.webStyle));
    expect(threeLevel.map(([id, , rules]) => [id, rules.length > 0])).toEqual([
      [Base.webStyle.componentId, true],
      [EmptyMiddle.webStyle.componentId, false],
      [OverEmptyMiddle.webStyle.componentId, true],
    ]);
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
