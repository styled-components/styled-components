// @flow
import throwStyledError from '../error';

describe('development', () => {
  it('returns a rich error', () => {
    expect(() => {
      throwStyledError(2);
    }).toThrowErrorMatchingSnapshot();
  });

  it('allows interpolation', () => {
    expect(() => {
      throwStyledError(1, 'foo');
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('production', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  it('returns an error link', () => {
    expect(() => {
      throwStyledError(2);
    }).toThrowErrorMatchingSnapshot();
  });

  it('returns an error link with interpolations if given', () => {
    expect(() => {
      throwStyledError(1, 'foo');
    }).toThrowErrorMatchingSnapshot();
  });
});
