import { SPLITTER } from '../constants';
import { CR, FORM_FEED, LF } from './charCodes';

/**
 * Rule text as it is written beside {@link SPLITTER}: a line break directly
 * after `*\/` becomes a space, so no rule holds the splitter and no rule's
 * text can read as the rehydration marker after it.
 */
export function guardSplitter(rule: string): string {
  let at = rule.indexOf('*/');
  if (at === -1) return rule;
  let out = '';
  let start = 0;
  while (at !== -1) {
    const c = rule.charCodeAt(at + 2);
    if (c === LF || c === CR || c === FORM_FEED) {
      out += rule.substring(start, at + 2) + ' ';
      start = at + 3;
    }
    at = rule.indexOf('*/', at + 2);
  }
  return start === 0 ? rule : out + rule.substring(start);
}

/**
 * Convenience function for joining strings to form className chains
 */
export function joinStrings(a?: string | undefined, b?: string | undefined): string {
  return a && b ? a + ' ' + b : a || b || '';
}

/** Join compiled CSS rules with the SC splitter delimiter. */
export function joinRules(rules: string[]): string {
  let css = '';
  for (let i = 0; i < rules.length; i++) {
    css += guardSplitter(rules[i]) + SPLITTER;
  }
  return css;
}

export function stripSplitter(css: string): string {
  if (!css) return css;
  return css.replaceAll(SPLITTER, '');
}
