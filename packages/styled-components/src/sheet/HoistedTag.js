// @flow

import type { HoistedTag, GroupedTag, Tag } from './types';
import { DefaultGroupedTag } from './GroupedTag';
import { WindowedTag } from './WindowedTag';

const hoistedRuleRe = /\s*@import/;

export class DefaultHoistedTag implements HoistedTag {
  hoistedTag: GroupedTag;

  normalTag: GroupedTag;

  /*
  The number of Groups in the tag
  */
  groups: number;

  constructor(tag: Tag) {
    this.hoistedTag = new DefaultGroupedTag(new WindowedTag(tag));
    this.normalTag = new DefaultGroupedTag(new WindowedTag(tag));
    this.groups = 0;
  }

  insertRules(group: number, rules: string[]): void {
    const hoistedRules = [];
    const normalRules = [];

    for (let i = 0, l = rules.length; i < l; i++) {
      const rule = rules[i];
      if (hoistedRuleRe.test(rule)) {
        hoistedRules.push(rule);
      } else {
        normalRules.push(rule);
      }
    }

    this.normalTag.insertRules(group, normalRules);
    this.hoistedTag.insertRules(group, hoistedRules);
    // We just use the normalTag groups
    // since the normalTag and hoistedTag have the same groups
    this.groups = this.normalTag.groups;
  }

  clearGroup(group: number) {
    this.normalTag.clearGroup(group);
    this.hoistedTag.clearGroup(group);
    this.groups = this.normalTag.groups;
  }

  getHoistedAndNormalGroups(group: number) {
    return { hoisted: this.hoistedTag.getGroup(group), normal: this.normalTag.getGroup(group) };
  }
}
