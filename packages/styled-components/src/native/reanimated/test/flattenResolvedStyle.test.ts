import { flattenResolvedStyle } from '../flattenResolvedStyle';

describe('flattenResolvedStyle', () => {
  it('merges array style layers in order', () => {
    expect(flattenResolvedStyle([{ a: 1 }, { b: 2 }, { a: 3 }])).toEqual({ a: 3, b: 2 });
  });

  it('merges nested array layers in order at any depth', () => {
    expect(flattenResolvedStyle([{ a: 1, b: 1 }, [{ a: 2 }, [{ b: 2, c: 2 }]], { c: 3 }])).toEqual({
      a: 2,
      b: 2,
      c: 3,
    });
  });

  it('skips falsy entries at every depth', () => {
    expect(
      flattenResolvedStyle([null, { a: 1 }, [false, undefined, 0, '', [null, { b: 2 }]]])
    ).toEqual({ a: 1, b: 2 });
  });

  it('copies a plain object', () => {
    const o = { x: 1 };
    const out = flattenResolvedStyle(o);
    expect(out).toEqual({ x: 1 });
    expect(out).not.toBe(o);
  });
});
