// @flow

import { makeTag, type Tag } from './StyleTags';

export interface ExtraRules {
  shouldUseExtraRule(cssRule: string): boolean,
  removeRule(id: string): void,
  insertRule(id: string, css: string): void,
}

export function importRule(target: ?HTMLElement, forceServer: boolean, getFirstTag: () => ?Tag<any>): ExtraRules {
  let tag: Tag<any>;

  function getTag() {
    if (tag !== undefined) {
      return tag;
    }

    const insertBefore = true;
    const firstTag = getFirstTag();

    return (tag = makeTag(
      target,
      firstTag ? firstTag.styleTag : null,
      forceServer,
      insertBefore
    ));
  }

  function generateId(id) {
    return `${id}-import`
  }


  return {
    shouldUseExtraRule(rule) {
      return rule.indexOf('@import') !== -1
    },
    insertRule(id, css: string) {
      getTag().insertRules(generateId(id), [css]);
    },
    removeRule(id) {
      if (tag !== undefined) {
        tag.removeRules(generateId(id));
      }
    }
  }
}

export function fontRule(target: ?HTMLElement, forceServer: boolean): ExtraRules {
  let tag: Tag<any>;

  function getTag() {
    if (tag !== undefined) {
      return tag;
    }

    return (tag = makeTag(
      target,
      null,
      forceServer,
    ));
  }

  function generateId(id) {
    return `${id}-font-face`;
  }

  return {
    shouldUseExtraRule(rule) {
      return rule.indexOf('@font-face') !== -1
    },
    insertRule(id, css: string) {
      getTag().insertRules(generateId(id), [css]);
    },
    removeRule(id) {
      if (tag !== undefined) {
        tag.removeRules(generateId(id));
      }
    }
  }
}
