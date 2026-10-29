import { ComponentType } from 'react';
import createGlobalStyle from '../constructors/createGlobalStyle';
import css from '../constructors/css';
import keyframes from '../constructors/keyframes';
import styled from '../constructors/styled';

export interface GlobalStyleShape {
  make: () => readonly [ComponentType<any>, ComponentType<any>];
  name: string;
  tokens: readonly [string, string];
}

/**
 * Each entry is two separate `createGlobalStyle` calls. Calls whose rules are
 * not the same static text must keep their own CSS when the other mounts.
 */
export const globalStyleShapes: readonly GlobalStyleShape[] = [
  {
    name: 'static text that differs',
    tokens: ['--a', '--b'],
    make: () => [createGlobalStyle`html { --a: 1; }`, createGlobalStyle`html { --b: 1; }`],
  },
  {
    name: 'the same CSS with different source text',
    tokens: ['--a', '--a'],
    make: () => [createGlobalStyle`html { --a: 1; }`, createGlobalStyle`html{--a:1;}`],
  },
  {
    name: 'a single function interpolation',
    tokens: ['--a', '--b'],
    make: () => [
      createGlobalStyle`${() => 'html { --a: 1; }'}`,
      createGlobalStyle`${() => 'html { --b: 1; }'}`,
    ],
  },
  {
    name: 'several functions and different static text',
    tokens: ['--a', '--b'],
    make: () => [
      createGlobalStyle`html { --a: ${() => '1'}; --c: ${() => '2'}; }`,
      createGlobalStyle`html { --b: ${() => '3'}; --d: ${() => '4'}; }`,
    ],
  },
  {
    name: 'several functions and the same static text',
    tokens: ['red', 'black'],
    make: () => [
      createGlobalStyle`html { color: ${() => 'red'}; background: ${() => 'blue'}; }`,
      createGlobalStyle`html { color: ${() => 'black'}; background: ${() => 'white'}; }`,
    ],
  },
  {
    name: 'a function inside different static text',
    tokens: ['--a', '--b'],
    make: () => [
      createGlobalStyle`html { --a: ${() => 1}; }`,
      createGlobalStyle`html { --b: ${() => 1}; }`,
    ],
  },
  {
    name: 'a function inside the same static text',
    tokens: ['red', 'blue'],
    make: () => [
      createGlobalStyle`html { color: ${() => 'red'}; }`,
      createGlobalStyle`html { color: ${() => 'blue'}; }`,
    ],
  },
  {
    name: 'a nested css helper that is only a function',
    tokens: ['--a', '--b'],
    make: () => [
      createGlobalStyle`${css`
        ${() => 'html { --a: 1; }'}
      `}`,
      createGlobalStyle`${css`
        ${() => 'html { --b: 1; }'}
      `}`,
    ],
  },
  {
    name: 'a nested css helper with different static text',
    tokens: ['--a', '--b'],
    make: () => [
      createGlobalStyle`${css`
        html {
          --a: 1;
        }
      `}`,
      createGlobalStyle`${css`
        html {
          --b: 1;
        }
      `}`,
    ],
  },
  {
    name: 'a nested css helper with the same static text',
    tokens: ['red', 'blue'],
    make: () => [
      createGlobalStyle`${css`
        html {
          color: ${() => 'red'};
        }
      `}`,
      createGlobalStyle`${css`
        html {
          color: ${() => 'blue'};
        }
      `}`,
    ],
  },
  {
    name: 'the function argument form',
    tokens: ['--a', '--b'],
    make: () => [
      createGlobalStyle(() => 'html { --a: 1; }'),
      createGlobalStyle(() => 'html { --b: 1; }'),
    ],
  },
  {
    name: 'object styles with different custom properties',
    tokens: ['--a', '--b'],
    make: () => [
      createGlobalStyle({ html: { '--a': () => '1' } }),
      createGlobalStyle({ html: { '--b': () => '1' } }),
    ],
  },
  {
    name: 'object styles with the same static text',
    tokens: ['red', 'blue'],
    make: () => [
      createGlobalStyle({ html: { '--color': () => 'red' } }),
      createGlobalStyle({ html: { '--color': () => 'blue' } }),
    ],
  },
  {
    name: 'the same function passed to two calls',
    tokens: ['--shared', '--shared'],
    make: () => {
      const fn = () => 'html { --shared: 1; }';
      return [createGlobalStyle`${fn}`, createGlobalStyle`${fn}`];
    },
  },
  {
    name: 'a factory that closes over different values',
    tokens: ['--fact-a', '--fact-b'],
    make: () => {
      const make = (token: string) => createGlobalStyle`${() => `html { ${token}: 1; }`}`;
      return [make('--fact-a'), make('--fact-b')];
    },
  },
  {
    name: 'styled component selectors',
    tokens: ['--a', '--b'],
    make: () => {
      const Button = styled.button`
        color: red;
      `;
      const Link = styled.a`
        color: blue;
      `;
      return [createGlobalStyle`${Button} { --a: 1; }`, createGlobalStyle`${Link} { --b: 1; }`];
    },
  },
  {
    name: 'keyframes interpolations',
    tokens: ['--a', '--b'],
    make: () => {
      const fade = keyframes`from { opacity: 0; }`;
      const rise = keyframes`from { opacity: 1; }`;
      return [
        createGlobalStyle`html { animation-name: ${fade}; --a: 1; }`,
        createGlobalStyle`html { animation-name: ${rise}; --b: 1; }`,
      ];
    },
  },
];
