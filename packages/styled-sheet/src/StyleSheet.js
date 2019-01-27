// @flow

import type { Tag } from './types';

const makeRuleGroupMarker = (name: string) =>
  `/* sc-component-id: ${name} */\n`;

class StyleSheet {
  // Keep the size of each rule group in an array
  rulesPerGroup: number[];

  // Keep a mapping of a group's index to its name
  namesPerGroup: { [name: string]: number };

  tag: Tag;

  constructor(tag: Tag) {
    this.tag = tag;
    this.rulesPerGroup = [];
    // $FlowFixMe
    this.namesPerGroup = Object.create(null);
  }

  // Registers a new rule group and returns its "order index"
  createRuleGroup(name: string): number {
    let index = this.namesPerGroup[name];
    if (index !== undefined) {
      return index;
    }

    index = this.rulesPerGroup.length;
    this.rulesPerGroup.push(0);
    this.namesPerGroup[name] = index;
    return index;
  }

  // Retrieves the index of the first rule of a group,
  // i.e. the number of rules that come before this group
  indexOfGroup(group: number): number {
    let index = 0;
    for (let i = 0; i < group; i++) {
      index += this.rulesPerGroup[i];
    }
    return index;
  }

  // Appends rules to the end of the specified group's rules and
  // returns the number of rules that have been added
  insertRules(group: number, rules: string[]): number {
    let added = 0;
    // Retrieve the index of this group's last rule (by adding 1)
    let index = this.indexOfGroup(group + 1);

    for (let i = 0, l = rules.length; i < l; i++) {
      if (this.tag.insertRule(index, rules[i])) {
        added++;
        index++;
      }
    }

    this.rulesPerGroup[group] += added;
    return added;
  }

  // Deletes all rules for the specified group
  clearGroup(group: number): void {
    const size = this.rulesPerGroup[group];
    const firstIndex = this.indexOfGroup(group);
    const lastIndex = firstIndex + size - 1;

    for (let i = lastIndex; i >= lastIndex; i--) {
      this.tag.deleteRule(i);
    }

    this.rulesPerGroup[group] = 0;
  }

  toString(): string {
    const { rulesPerGroup, namesPerGroup } = this;

    let css = '';
    let groupIndex = 0;
    let ruleIndex = 0;

    // Iterate through all groups by name
    // We rely on this order being identical to the groups' ordering
    for (const name in namesPerGroup) {
      const size = rulesPerGroup[groupIndex++];
      const endIndex = ruleIndex + size;

      css += makeRuleGroupMarker(name);
      while (ruleIndex < endIndex) {
        css += `${this.tag.getRule(ruleIndex++)  }\n`;
      }
    }

    return css;
  }
}

export default StyleSheet;
