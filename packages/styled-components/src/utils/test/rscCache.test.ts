/**
 * @jest-environment node
 */

jest.mock('../isRsc', () => ({ IS_RSC: true }));

import styled from '../../index';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../createWarnTooManyClasses';
import { recallRscRules, rememberRscRules } from '../rscCache';

describe('rememberRscRules', () => {
  it('holds at most one warning-threshold of class names per component, the oldest dropped first', () => {
    const Box = styled.div`
      color: red;
    `;
    const limit = TOO_MANY_CLASSES_LIMIT;

    for (let i = 0; i < limit + 5; i++) {
      rememberRscRules(Box.webStyle, 'name' + i, ['.name' + i + '{}']);
    }

    expect(recallRscRules(Box.webStyle, 'name0')).toBeUndefined();
    expect(recallRscRules(Box.webStyle, 'name4')).toBeUndefined();
    expect(recallRscRules(Box.webStyle, 'name5')).toEqual(['.name5{}']);
    expect(recallRscRules(Box.webStyle, 'name' + (limit + 4))).toEqual([
      '.name' + (limit + 4) + '{}',
    ]);
  });
});
