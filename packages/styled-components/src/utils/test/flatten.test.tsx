import React from 'react';
import TestRenderer from 'react-test-renderer';
import styled from '../../constructors/styled';
import flatten from '../flatten';

describe('flatten', () => {
  it('doesnt merge strings', () => {
    expect(flatten(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
  });

  it('drops nulls', () => {
    expect(flatten(['foo', false, 'bar', undefined, 'baz', null])).toEqual(['foo', 'bar', 'baz']);
  });

  it('doesnt drop any numbers', () => {
    expect(flatten(['foo', 0, 'bar', NaN, 'baz', -1])).toEqual([
      'foo',
      '0',
      'bar',
      'NaN',
      'baz',
      '-1',
    ]);
  });

  it('toStrings everything', () => {
    // @ts-expect-error invalid input test
    expect(flatten([1, true])).toEqual(['1', 'true']);
  });

  it('hypenates objects', () => {
    const obj = {
      fontSize: 14,
      lineHeight: '15px',
      WebkitFilter: 'blur(2px)',
      fontWeight: 500,
    };
    const css = [
      'font-size: 14px;',
      'line-height: 15px;',
      '-webkit-filter: blur(2px);',
      'font-weight: 500;',
    ];
    expect(flatten([obj])).toEqual(css);
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual([
      'some:thing;',
      ...css,
      'something: else;',
    ]);
  });

  it('handles nested objects', () => {
    const obj = {
      fontSize: '14px',
      '@media screen and (min-width: 250px)': {
        fontSize: '16px',
      },
      '&:hover': {
        fontWeight: 'bold',
      },
    };
    const css = [
      'font-size: 14px;',
      '@media screen and (min-width: 250px) {',
      'font-size: 16px;',
      '}',
      '&:hover {',
      'font-weight: bold;',
      '}',
    ];
    expect(flatten([obj])).toEqual(css);
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual([
      'some:thing;',
      ...css,
      'something: else;',
    ]);
  });

  it('toStrings class instances', () => {
    class SomeClass {
      toString() {
        return 'some: thing;';
      }
    }
    // This works but we don't support it directly in the Interpolation type,
    // because it prevents generating type errors that we usually want.
    // @ts-expect-error properly catching unexpected class instance
    expect(flatten([new SomeClass()])).toEqual(['some: thing;']);
  });

  it('flattens subarrays', () => {
    expect(flatten([1, 2, [3, 4, 5], 'come:on;', 'lets:ride;'])).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      'come:on;',
      'lets:ride;',
    ]);
  });

  it('defers functions', () => {
    const func = () => 'bar';
    const funcWFunc = () => ['static', (subfunc: Function) => (subfunc ? 'bar' : 'baz')];
    expect(flatten(['foo', func, 'baz'])).toEqual(['foo', func, 'baz']);
    expect(flatten(['foo', funcWFunc, 'baz'])).toEqual(['foo', funcWFunc, 'baz']);
  });

  it('executes functions', () => {
    const func = () => 'bar';
    expect(flatten(['foo', func, 'baz'], { bool: true, theme: {} })).toEqual(['foo', 'bar', 'baz']);
  });

  it('passes values to function', () => {
    const func = ({ bool }: any) => (bool ? 'bar' : 'baz');
    expect(flatten(['foo', func], { bool: true, theme: {} })).toEqual(['foo', 'bar']);
    expect(flatten(['foo', func], { bool: false, theme: {} })).toEqual(['foo', 'baz']);
  });

  it('recursively calls functions', () => {
    const func = () => ['static', ({ bool }: any) => (bool ? 'bar' : 'baz')];
    expect(flatten(['foo', func], { bool: true } as any)).toEqual(['foo', 'static', 'bar']);
    expect(flatten(['foo', func], { bool: false } as any)).toEqual(['foo', 'static', 'baz']);
  });

  it('throws if trying to interpolate a normal React component', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const Foo = ({ className }: { className?: string }) => (
      <div className={className}>hello there!</div>
    );

    const Bar = styled.div`
      ${
        // @ts-expect-error invalid input
        Foo
      }: {
        background-color: red;
      }
    `;

    TestRenderer.create(<Bar />);

    expect((console.error as jest.Mock<Console['warn']>).mock.calls[0][0]).toMatchInlineSnapshot(
      `"Foo is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details."`
    );
  });

  it('does not error for regular functions', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const SvgIcon = styled.svg`
      vertical-align: middle;
      height: ${props => (props.height ? `${props.height}px` : '22px')};
      width: ${props => (props.width ? `${props.width}px` : '22px')};
      text-align: center;
      font-size: 40px;
    `;

    expect(() =>
      TestRenderer.create(
        <SvgIcon viewBox="0 0 512 512">
          <path d="M39.6,95.6z" />
        </SvgIcon>
      )
    ).not.toThrowError();

    expect(console.error).not.toHaveBeenCalled();
  });
});

it('does not error for functions that return null', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});

  const Bar = styled.div`
    ${() => null}
  `;

  expect(() => TestRenderer.create(<Bar />)).not.toThrowError();

  expect(console.error).not.toHaveBeenCalled();
});
