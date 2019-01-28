// @flow

import Stylis from 'stylis/stylis.min';
import insertRulePlugin from 'stylis-rule-sheet';

const stylisSplitter = new Stylis({
  global: false,
  cascade: true,
  keyframe: false,
  prefix: false,
  compress: false,
  semicolon: true,
});

let parsingRules = [];

// eslint-disable-next-line consistent-return
const returnRulesPlugin = context => {
  if (context === -2) {
    const parsedRules = parsingRules;
    parsingRules = [];
    return parsedRules;
  }
};

const parseRulesPlugin = insertRulePlugin(rule => {
  parsingRules.push(rule);
});

stylisSplitter.use([parseRulesPlugin, returnRulesPlugin]);

const splitCssRules = (css: string): string[] => stylisSplitter('', css);

export default splitCssRules;
