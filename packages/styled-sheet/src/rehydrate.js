// @flow

import type { GroupedTag } from './types';
import { SC_ATTR, SC_ATTR_VERSION, SC_VERSION } from './constants';
import extractRuleGroups from './extractRuleGroups';
import splitCssRules from './splitCssRules';

const selector = `style[${SC_ATTR}][${SC_ATTR_VERSION}="${SC_VERSION}"]`;

const rehydrate = (groupedTag: GroupedTag): void => {
  const nodes = document.querySelectorAll(selector);
  const nodesSize = nodes.length;
  if (nodesSize === 0) {
    return;
  }

  for (let i = 0; i < nodesSize; i++) {
    const css = nodes[i].textContent;
    const ruleGroups = extractRuleGroups(css);
    for (let j = 0, l = ruleGroups.length; j < l; j++) {
      const { contents, group } = ruleGroups[j];
      const rules = splitCssRules(contents);
      groupedTag.insertRules(group, rules);
    }
  }
};

export default rehydrate;
