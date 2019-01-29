// @flow

import type { GroupedTag, GroupedKeys } from './types';
import { SC_ATTR, SC_ATTR_VERSION, SC_VERSION, SC_ACTIVE } from './constants';
import Group from './Group';
import extractRuleGroups from './extractRuleGroups';
import splitCssRules from './splitCssRules';

const selector = `style[${SC_ATTR}][${SC_ATTR_VERSION}="${SC_VERSION}"]`;

// Rehydrates all unrehydrated style tags into a GroupedTag and
// returns a Set of rehydrated keys
const rehydrate = (groupedTag: GroupedTag): GroupedKeys => {
  // $FlowFixMe
  const groupedKeys = Object.create(null);

  const nodes = document.querySelectorAll(selector);
  const nodesSize = nodes.length;
  if (nodesSize === 0) {
    return groupedKeys;
  }

  for (let i = 0; i < nodesSize; i++) {
    const node = nodes[i]
    if (node.getAttribute(SC_ATTR) === SC_ACTIVE) {
      continue
    }

    const css = node.textContent;
    const ruleGroups = extractRuleGroups(css);
    const ruleGroupsSize = ruleGroups.length

    for (let j = 0; j < ruleGroupsSize; j++) {
      const { contents, group, name, keys } = ruleGroups[j];

      const rules = splitCssRules(contents);
      Group.rehydrate(name, group);
      groupedTag.insertRules(group, rules);

      let groupKeys = groupedKeys[group];
      if (groupKeys === undefined) {
        // $FlowFixMe
        groupKeys = (groupedKeys[group] = Object.create(null));
      }

      const keysSize = keys.length
      for (let k = 0; k < keysSize; k++) {
        groupKeys[keys[k]] = true;
      }
    }
  }

  return groupedKeys;
};

export default rehydrate;
