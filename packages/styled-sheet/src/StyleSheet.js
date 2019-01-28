// @flow

import type { GroupedTag, GroupedKeys } from './types';
import { IS_BROWSER } from './constants';
import { RuleGroupTag, DefaultTag, VirtualTag } from './tags';
import { makeCssMarker } from './utils';
import GroupRegistry from './GroupRegistry';
import rehydrate from './rehydrate';

// Ensure we only rehydrate once
let SHOULD_REHYDRATE = !IS_BROWSER;

class StyleSheet {
  groups: GroupedTag;

  hasRehydrated: boolean;

  keys: GroupedKeys;

  constructor(target?: HTMLElement, forceServer?: boolean) {
    // $FlowFixMe
    this.keys = Object.create(null);

    const tag = forceServer ? new DefaultTag(target) : new VirtualTag();
    const groups = (this.groups = new RuleGroupTag(tag));

    if (!forceServer && SHOULD_REHYDRATE) {
      SHOULD_REHYDRATE = false;
      rehydrate(groups);
    }
  }

  register(name: string): number {
    return GroupRegistry.registerRuleGroup(name);
  }

  hasKey(group: number, key: string): boolean {
    const groupKeys = this.keys[group];
    return groupKeys !== undefined && groupKeys[key] !== undefined;
  }

  registerKey(group: number, key: string) {
    let groupKeys = this.keys[group]
    if (groupKeys === undefined) {
      // $FlowFixMe
      groupKeys = (this.keys[group] = Object.create(null));
    }

    groupKeys[key] = true;
  }

  inject(group: number, key: string, rules: string[]) {
    if (!this.hasKey(group, key)) {
      this.registerKey(group, key);
      this.groups.insertRules(group, rules);
    }
  }

  remove(group: number) {
    // $FlowFixMe
    this.keys[group] = Object.create(null);
    this.groups.clearGroup(group);
  }

  toString(): string {
    let css = '';
    GroupRegistry.forEach((name, group) => {
      const groupRules = this.groups.getGroup(group);
      if (groupRules !== '') {
        const keysForGroup = Object.keys(this.keys[group] || {});
        const marker = makeCssMarker(name, group, keysForGroup);
        css += `${marker}\n${groupRules}`;
      }
    });

    return css;
  }
}

export default StyleSheet;
