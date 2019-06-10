// @flow
import { Parser } from 'acorn';
import estraverse from 'estraverse';

import type { RuleSet } from '../types';

export default function checkThemeReferences(rules: RuleSet): any {
  let isThemePresent = false;
  const enter = function enter(node) {
    if (node.type === 'Identifier' && node.name === 'theme') {
      isThemePresent = true;
      this.break();
    }
  };

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    if (typeof rule === 'function') {
      const fnStr = `const interFn = ${String(rule)}`;

      estraverse.traverse(Parser.parse(fnStr), {
        enter,
      });
    }

    if (isThemePresent === true) break;
  }

  return isThemePresent;
}
