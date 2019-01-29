// @flow

import type { GroupedTag, GroupedKeys } from './types';
import { IS_BROWSER } from './constants';
import { RuleGroupTag, DefaultTag, VirtualTag } from './tags';
import { makeCssMarker, wrapInStyleTag } from './utils';
import GroupRegistry from './GroupRegistry';
import rehydrate from './rehydrate';

// Ensure we only rehydrate once
let SHOULD_REHYDRATE = !IS_BROWSER;

const makeRuleGroupTag = (target?: HTMLElement, forceServer?: boolean): GroupedTag => {
  const tag = forceServer ? new VirtualTag() : new DefaultTag(target);
  return new RuleGroupTag(tag);
};

class Sheet {
  groups: GroupedTag;

  target: void | HTMLElement;

  forceServer: boolean;

  hasRehydrated: boolean;

  keys: GroupedKeys;

  constructor(target?: HTMLElement, forceServer?: boolean) {
    // $FlowFixMe
    this.keys = Object.create(null);
    this.forceServer = !!forceServer;
    this.target = target;

    const groups = (this.groups = makeRuleGroupTag(target, forceServer));
    if (!forceServer && SHOULD_REHYDRATE) {
      SHOULD_REHYDRATE = false;
      rehydrate(groups);
    }
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

  // This is just meant for SSR where it's safe to reset
  // the inner rule group tag to flush known rules
  reset() {
    this.groups = makeRuleGroupTag(this.target, this.forceServer);
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

  toHTML(): string {
    const css = this.toString();
    return css !== '' ? wrapInStyleTag(css) : '';
  }
}

export default Sheet;
