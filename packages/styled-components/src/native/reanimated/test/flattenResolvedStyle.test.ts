import { flattenResolvedStyle } from '../flattenResolvedStyle';

describe('flattenResolvedStyle', () => {
  it('merges array style layers in order', () => {
    expect(flattenResolvedStyle([{ a: 1 }, { b: 2 }, { a: 3 }])).toEqual({ a: 3, b: 2 });
  });

  it('copies a plain object', () => {
    const o = { x: 1 };
    const out = flattenResolvedStyle(o);
    expect(out).toEqual({ x: 1 });
    expect(out).not.toBe(o);
  });
});
