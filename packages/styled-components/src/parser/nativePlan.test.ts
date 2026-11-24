import { classifyRuleNow } from './nativePlan';

describe('native selector classification', () => {
  const cls = (sel: string) => classifyRuleNow([sel]);

  it('treats a quoted ) inside :not([attr]) as part of the value', () => {
    expect(cls('&:not([data-x=")"])')).toEqual({
      kind: 'attr',
      selectors: [{ attrs: [{ name: 'data-x', value: ')', negate: true }] }],
    });
  });

  it('accepts colon-containing attribute names', () => {
    expect(cls('&[xlink:href]')).toEqual({
      kind: 'attr',
      selectors: [{ attrs: [{ name: 'xlink:href' }] }],
    });
  });

  it('rejects attribute names with other punctuation', () => {
    expect(cls('&[a.b]')).toEqual({ kind: 'unsupported' });
  });

  it.each([
    ['2n+1', 2, 1],
    [' 2n + 1 ', 2, 1],
    ['-n+3', -1, 3],
    ['+n', 1, 0],
    ['n', 1, 0],
    ['-n', -1, 0],
    ['3', 0, 3],
    ['-3', 0, -3],
    ['odd', 2, 1],
    ['EVEN', 2, 0],
    ['2 n- 1', 2, -1],
  ])(':nth-child(%s) parses to a=%i b=%i', (formula, a, b) => {
    expect(cls(`&:nth-child(${formula})`)).toMatchObject({ kind: 'nthChild', spec: { a, b } });
  });

  it.each(['2n+', '2n 1', '1n+1n', 'n+ +1', '', 'foo', '2.5n'])(
    'rejects :nth-child(%s)',
    formula => {
      expect(cls(`&:nth-child(${formula})`)).toEqual({ kind: 'unsupported' });
    }
  );

  it('parses an `of S` suffix and rejects it for of-type', () => {
    expect(cls('&:nth-child(2n+1 of [data-x])')).toMatchObject({
      kind: 'nthChild',
      spec: { a: 2, b: 1, of: { kind: 'attr', attr: { name: 'data-x' } } },
    });
    expect(cls('&:nth-of-type(2n+1 of [data-x])')).toEqual({ kind: 'unsupported' });
  });

  it('derives direction and type from the nth name', () => {
    expect(cls('&:last-of-type')).toMatchObject({
      spec: { a: 0, b: 1, fromEnd: true, ofType: true },
    });
    expect(cls('&:only-child')).toMatchObject({ spec: { onlyChild: true, fromEnd: false } });
    expect(cls('&:nth-last-child(2)')).toMatchObject({ spec: { a: 0, b: 2, fromEnd: true } });
    expect(cls('&:first-child(2)')).toEqual({ kind: 'unsupported' });
  });

  it('classifies combinators and rejects other leading characters', () => {
    expect(cls('.sc-abc > &')).toEqual({
      kind: 'combinator',
      combinator: 'child',
      ancestorId: 'sc-abc',
    });
    expect(cls('.sc-abc &:hover')).toMatchObject({ kind: 'combinator', pseudo: 'hover' });
    expect(cls('div')).toEqual({ kind: 'unsupported' });
    expect(cls('&.foo')).toEqual({ kind: 'unsupported' });
  });

  it('keeps operator forms of attribute selectors', () => {
    expect(cls('&[a~="x"]')).toMatchObject({
      selectors: [{ attrs: [{ name: 'a', value: 'x', operator: '~=' }] }],
    });
    expect(cls('&[a*=x i]')).toMatchObject({
      selectors: [{ attrs: [{ name: 'a', value: 'x', operator: '*=', caseFlag: 'i' }] }],
    });
  });

  it('classifies :is() and :where() pseudo-state enumerations', () => {
    expect(cls('&:is(:hover, :focus)')).toEqual({
      kind: 'pseudoFanOut',
      pseudos: ['hover', 'focus'],
    });
    expect(cls('&:where(:active, :disabled)')).toEqual({
      kind: 'pseudoFanOut',
      pseudos: ['pressed', 'disabled'],
    });
  });

  it.each(['&:is(:hover)garbage', '&:where(:hover)garbage', '&:is(:hover):focus'])(
    'rejects trailing tokens after :is() / :where() (%s)',
    selector => {
      expect(cls(selector)).toEqual({ kind: 'unsupported' });
    }
  );
});
