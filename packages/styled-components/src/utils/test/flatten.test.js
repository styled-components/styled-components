// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';
import flatten from '../flatten';
import styled from '../../constructors/styled';

describe('flatten', () => {
  it('doesnt merge strings', () => {
    expect(flatten(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
  });

  it('drops nulls', () => {
    // $FlowInvalidInputTest
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
    // $FlowInvalidInputTest
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
      'font-weight: 500;'
    ];
    // $FlowFixMe
    expect(flatten([obj])).toEqual(css);
    // $FlowFixMe
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
      '}'
    ];
    // $FlowFixMe
    expect(flatten([obj])).toEqual(css);
    // $FlowFixMe
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
    // $FlowFixMe
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
    const funcWFunc = () => ['static', subfunc => (subfunc ? 'bar' : 'baz')];
    expect(flatten(['foo', func, 'baz'])).toEqual(['foo', func, 'baz']);
    expect(flatten(['foo', funcWFunc, 'baz'])).toEqual(['foo', funcWFunc, 'baz']);
  });

  it('executes functions', () => {
    const func = () => 'bar';
    expect(flatten(['foo', func, 'baz'], { bool: true })).toEqual(['foo', 'bar', 'baz']);
  });

  it('passes values to function', () => {
    const func = ({ bool }) => (bool ? 'bar' : 'baz');
    expect(flatten(['foo', func], { bool: true })).toEqual(['foo', 'bar']);
    expect(flatten(['foo', func], { bool: false })).toEqual(['foo', 'baz']);
  });

  it('recursively calls functions', () => {
    const func = () => ['static', ({ bool }) => (bool ? 'bar' : 'baz')];
    expect(flatten(['foo', func], { bool: true })).toEqual(['foo', 'static', 'bar']);
    expect(flatten(['foo', func], { bool: false })).toEqual(['foo', 'static', 'baz']);
  });

  it('throws if trying to interpolate a normal React component', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Foo = ({ className }) => <div className={className}>hello there!</div>;

    const Bar = styled.div`
      ${Foo}: {
        background-color: red;
      };
    `;

    TestRenderer.create(<Bar />);

    expect(console.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Foo is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details."`
    );
  });

  it('does not warn for regular functions', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const SvgIcon = styled.svg`
      vertical-align: middle;
      height: ${props => (props.height ? props.height : '22px')};
      width: ${props => (props.width ? props.width : '22px')};
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

    expect(console.warn).not.toHaveBeenCalled();
  });
});
