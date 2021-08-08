/* ported from https://github.com/jonschlinkert/mixin-deep; thanks Jon! */
import mixinDeep from '../mixinDeep';

it('should deeply mix the properties of object into the first object.', () => {
  expect(mixinDeep({ a: { aa: 'aa' } }, { a: { bb: 'bb' } }, { a: { cc: 'cc' } })).toEqual({
    a: { aa: 'aa', bb: 'bb', cc: 'cc' },
  });
  expect(
    mixinDeep(
      { a: { aa: 'aa', dd: { ee: 'ff' } } },
      { a: { bb: 'bb', dd: { gg: 'hh' } } },
      { a: { cc: 'cc', dd: { ii: 'jj' } } }
    )
  ).toEqual({ a: { aa: 'aa', dd: { ee: 'ff', gg: 'hh', ii: 'jj' }, bb: 'bb', cc: 'cc' } });
});

it('should copy properties onto the first object', () => {
  const obj1 = { a: 0, b: 1 };
  const obj2 = { c: 2, d: 3 };
  const obj3 = { a: 4, d: 5 };

  const actual = { a: 4, b: 1, c: 2, d: 5 };

  expect(mixinDeep({}, obj1, obj2, obj3)).toEqual(actual);
  expect(actual).not.toEqual(obj1);
  expect(actual).not.toEqual(obj2);
  expect(actual).not.toEqual(obj3);
});

it('should mixin nested object properties', () => {
  const obj1 = { a: { b: 1, c: 1, d: { e: 1, f: 1 } } };
  const obj2 = { a: { b: 2, d: { f: 'f' } } };

  expect(mixinDeep(obj1, obj2)).toEqual({ a: { b: 2, c: 1, d: { e: 1, f: 'f' } } });
});

it('should use the last value defined', () => {
  const obj1 = { a: 'b' };
  const obj2 = { a: 'c' };

  expect(mixinDeep(obj1, obj2)).toEqual({ a: 'c' });
});

it('should use the last value defined on nested object', () => {
  const obj1 = { a: 'b', c: { d: 'e' } };
  const obj2 = { a: 'c', c: { d: 'f' } };

  expect(mixinDeep(obj1, obj2)).toEqual({ a: 'c', c: { d: 'f' } });
});

it('should shallow mixin when an empty object is passed', () => {
  const obj1 = { a: 'b', c: { d: 'e' } };
  const obj2 = { a: 'c', c: { d: 'f' } };

  expect(mixinDeep({}, obj1, obj2)).toEqual({ a: 'c', c: { d: 'f' } });
});

it('should mixin additional objects into the first:', () => {
  const obj1 = { a: { b: 1, c: 1, d: { e: 1, f: 1 } } };
  const obj2 = { a: { b: 2, d: { f: 'f' } } };

  mixinDeep(obj1, obj2);
  expect(obj1).toEqual({ a: { b: 2, c: 1, d: { e: 1, f: 'f' } } });
});

it('should mixin objects during mixin', () => {
  const obj1 = { a: { b: 1 } };
  const obj2 = { a: { c: 2 } };

  const actual = mixinDeep({}, obj1, obj2);
  expect(actual).toEqual({ a: { b: 1, c: 2 } });
  expect(actual.a).toEqual(obj1.a);
  expect(actual.a).not.toEqual(obj2.a);
});

it('should deep mixin arrays during mixin', () => {
  const obj1 = { a: [1, 2, [3, 4]] };
  const obj2 = { b: [5, 6] };

  const actual = mixinDeep(obj1, obj2);
  expect(actual.a).toEqual([1, 2, [3, 4]]);
  expect(actual.a[2]).toEqual([3, 4]);
  expect(actual.b).toEqual(obj2.b);
});

it('should not modify source properties', () => {
  expect(mixinDeep({ test: true }).test).toEqual(true);
});

it('should not mixin arrays', () => {
  expect(mixinDeep([1, 2, 3])).toEqual([1, 2, 3]);
  expect(mixinDeep([1, 2, 3], {})).toEqual([1, 2, 3]);
});

it('should work with sparse objects:', () => {
  const actual = mixinDeep({}, undefined, { a: 'b' }, undefined, { c: 'd' });
  expect(actual).toEqual({ a: 'b', c: 'd' });
});

it('should mixin RegExps', () => {
  const fixture = /test/g;
  const actual = mixinDeep(fixture);
  expect(actual).toEqual(fixture);
});

it('should mixin Dates', () => {
  const fixture = new Date();
  const actual = mixinDeep(fixture);
  expect(actual).toEqual(fixture);
});

it('should not mixin objects created with custom constructor', () => {
  class TestType {}
  const fixture = new TestType();
  const actual = mixinDeep(fixture);
  expect(actual).toEqual(fixture);
});
