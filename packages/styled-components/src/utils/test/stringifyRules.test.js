import stringifyRules from '../stringifyRules';

describe('stringifyRules(rules)', () => {
  it('return different result when pass different function', () => {
    const result1 = stringifyRules([
      '1',
      () => '1',
    ]);
    const result2 = stringifyRules([
      '1',
      () => '2',
    ]);
    expect(result1).not.toBe(result2);
  });
});
