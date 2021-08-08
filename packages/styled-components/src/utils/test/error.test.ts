import styledError from '../error';

describe('development', () => {
  it('returns a rich error', () => {
    expect(() => {
      throw styledError(2);
    }).toThrowErrorMatchingInlineSnapshot(`
      "Can't collect styles once you've consumed a \`ServerStyleSheet\`'s styles! \`ServerStyleSheet\` is a one off instance for each server-side render cycle.

      - Are you trying to reuse it across renders?
      - Are you accidentally calling collectStyles twice?"
    `);
  });

  it('allows interpolation', () => {
    expect(() => {
      throw styledError(1, 'foo');
    }).toThrowErrorMatchingInlineSnapshot(`"Cannot create styled-component for component: foo."`);
  });
});

describe('production', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
  });

  it('returns an error link', () => {
    expect(() => {
      throw styledError(2);
    }).toThrowErrorMatchingInlineSnapshot(
      `"An error occurred. See https://git.io/JUIaE#2 for more information."`
    );
  });

  it('returns an error link with interpolations if given', () => {
    expect(() => {
      throw styledError(1, 'foo');
    }).toThrowErrorMatchingInlineSnapshot(
      `"An error occurred. See https://git.io/JUIaE#1 for more information. Args: foo"`
    );
  });
});
