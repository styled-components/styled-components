// @flow

import { makeCssMarker } from '../src/utils';
import extractRuleGroups from '../src/extractRuleGroups';

it('returns an empty array when no groups are found', () => {
  expect(extractRuleGroups('')).toEqual([]);
});

const singleGroup = `
${makeCssMarker('test', 123)}
.a { color: green; }
`.trim();

it('matches single rule group strings', () => {
  const res = [
    {
      contents: '\n.a { color: green; }',
      group: 123,
      name: 'test'
    }
  ];

  expect(extractRuleGroups(singleGroup)).toEqual(res);
});

const multipleGroups = `
${makeCssMarker('testA', 1)}
.a { color: green; }
${makeCssMarker('testB', 2)}
.b { color: red; }
.c { color: yellow; }
${makeCssMarker('testC', 3)}
.d { color: papayawhip; }
`.trim();

it('matches multiple rule groups in a string', () => {
  const res = [
    {
      contents: '\n.a { color: green; }\n',
      group: 1,
      name: 'testA'
    },
    {
      contents: '\n.b { color: red; }\n.c { color: yellow; }\n',
      group: 2,
      name: 'testB'
    },
    {
      contents: '\n.d { color: papayawhip; }',
      group: 3,
      name: 'testC'
    }
  ];

  expect(extractRuleGroups(multipleGroups)).toEqual(res);
});
