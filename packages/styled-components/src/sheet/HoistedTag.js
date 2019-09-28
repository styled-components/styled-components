// @flow

import type { HoistedTag, GroupedTag, Tag } from './types';
import { DefaultGroupedTag } from './GroupedTag';
import { WindowedTag } from './WindowedTag';

const hoistedRuleRe = /\s*@(font-face|import)/;

export class DefaultHoistedTag implements HoistedTag {
  hoistedTag: GroupedTag;

  normalTag: GroupedTag;

  length: number;

  constructor(tag: Tag) {
    this.hoistedTag = new DefaultGroupedTag(new WindowedTag(tag));
    this.normalTag = new DefaultGroupedTag(new WindowedTag(tag));
    this.length = 0;
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
    this.length = this.normalTag.length;
  }

  clearGroup(group: number) {
    this.normalTag.clearGroup(group);
    this.hoistedTag.clearGroup(group);
    this.length = this.normalTag.length;
  }

  // TODO: Needs to be replaced to keep hoisted ordering
  getGroup(group: number) {
    return this.hoistedTag.getGroup(group) + this.normalTag.getGroup(group);
  }
}
