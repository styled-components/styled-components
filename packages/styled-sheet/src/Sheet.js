// @flow

import type { GroupedTag, GroupedKeys, UniqueGroup } from './types';
import { IS_BROWSER } from './constants';
import { RuleGroupTag, DefaultTag, VirtualTag } from './tags';
import { makeCssMarker, wrapInStyleTag } from './utils';
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
  keys: { [groupIndex: number]: { [key: string]: any } };
  names: { [groupIndex: number]: string };

  constructor(target?: HTMLElement, forceServer?: boolean) {
    this.forceServer = !!forceServer;
    this.target = target;
    this.reset();

    const groups = (this.groups = makeRuleGroupTag(target, forceServer));
    if (!forceServer && SHOULD_REHYDRATE) {
      SHOULD_REHYDRATE = false;
      rehydrate(groups);
    }
  }

  reset() {
    this.keys = (Object.create(null): any);
    this.names = (Object.create(null): any);
    this.groups = makeRuleGroupTag(this.target, this.forceServer);
  }

  getGroupKeys(groupIndex: number) {
    const { keys } = this;
    if (groupIndex in keys) {
      return keys[groupIndex];
    } else {
      return (keys[groupIndex] = (Object.create(null): any));
    }
  }

  inject({ name, index }: UniqueGroup, key: string, rules: string[]) {
    if (!(name in this.names)) {
      this.names[index] = name;
    }

    const groupKeys = this.getGroupKeys(index);
    if (!(key in groupKeys)) {
      groupKeys[key] = true;
      this.groups.insertRules(index, rules);
    }
  }

  remove({ index }: UniqueGroup) {
    delete this.keys[index];
    this.groups.clearGroup(index);
  }

  toString(): string {
    let css = '';

    this.groups.forEach((groupIndex: number, groupRules: string) => {
      const name = this.names[groupIndex];
      if (name !== undefined && groupRules !== '') {
        const keysForGroup = Object.keys(this.getGroupKeys(groupIndex));
        const marker = makeCssMarker(name, groupIndex, keysForGroup);
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
