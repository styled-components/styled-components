import { SPLITTER } from '../constants';

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
    css += rules[i] + SPLITTER;
  }
  return css;
}

export function stripSplitter(css: string): string {
  if (!css) return css;
  return css.replaceAll(SPLITTER, '');
}
