import transformDeclPairs from 'css-to-react-native';
import {
  Dict,
  ExecutionContext,
  IInlineStyle,
  IInlineStyleConstructor,
  RuleSet,
  StyleSheet,
} from '../types';
import flatten from '../utils/flatten';
import generateComponentId from '../utils/generateComponentId';
import { joinStringArray } from '../utils/joinStrings';

// List of CSS values not supported by React Native
export const RN_UNSUPPORTED_VALUES = ['fit-content', 'min-content', 'max-content'];

function stripComments(css: string): string {
  if (css.indexOf('/*') === -1) return css;
  let result = '';
  let i = 0;
  let quote = 0; // 0 = none, 34 = ", 39 = '
  const len = css.length;
  while (i < len) {
    const ch = css.charCodeAt(i);
    if (quote) {
      if (ch === 92) {
        // backslash: copy it and the next char (escape sequence)
        result += css.substring(i, i + 2);
        i += 2;
        continue;
      }
      if (ch === quote) quote = 0;
      result += css[i];
      i++;
    } else if (ch === 34 || ch === 39) {
      quote = ch;
      result += css[i];
      i++;
    } else if (ch === 47 && css.charCodeAt(i + 1) === 42) {
      // /* comment */
      const end = css.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 2;
    } else {
      result += css[i];
      i++;
    }
  }
  return result;
}

/**
 * Extract CSS declaration pairs from flat CSS text.
 * Only handles `property: value;` — selectors, at-rules, and nesting
 * are not supported (and not expected in the native inline style path).
 */
export function parseCSSDeclarations(rawCss: string): [string, string][] {
  const css = stripComments(rawCss);
  const pairs: [string, string][] = [];
  const len = css.length;
  let i = 0;

  while (i < len) {
    // skip whitespace, stray semicolons, and braces (from selectors leaking through)
    while (
      i < len &&
      (css[i] === ' ' ||
        css[i] === '\n' ||
        css[i] === '\r' ||
        css[i] === '\t' ||
        css[i] === ';' ||
        css[i] === '{' ||
        css[i] === '}')
    )
      i++;

    if (i >= len) break;

    // find the colon separating property from value
    const colonIdx = css.indexOf(':', i);
    if (colonIdx === -1) break;

    const prop = css.substring(i, colonIdx).trim();

    let parenDepth = 0;
    let quote = 0; // 0 = none, 34 = ", 39 = '
    let j = colonIdx + 1;
    while (j < len) {
      const ch = css.charCodeAt(j);
      if (quote) {
        if (ch === 92) {
          j++; // skip escaped character
        } else if (ch === quote) {
          quote = 0;
        }
      } else if (ch === 34 || ch === 39) {
        quote = ch;
      } else if (ch === 40) {
        parenDepth++;
      } else if (ch === 41) {
        if (parenDepth > 0) parenDepth--;
      } else if (ch === 59 && parenDepth === 0) {
        break;
      }
      j++;
    }

    // Unclosed quote or paren: drop this declaration, find first ; to resume from
    if (j >= len && (quote !== 0 || parenDepth > 0)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[styled-components/native] Invalid CSS in declaration "${prop}": ` +
            (quote ? 'unterminated string' : 'unclosed parenthesis') +
            '. This declaration was dropped.'
        );
      }
      const semi = css.indexOf(';', colonIdx + 1);
      i = semi !== -1 ? semi + 1 : len;
      continue;
    }

    const value = css.substring(colonIdx + 1, j).trim();

    if (prop && value) {
      if (process.env.NODE_ENV !== 'production' && (prop[0] === '@' || prop.indexOf('{') !== -1)) {
        console.warn(
          `[styled-components/native] "${prop}" is not supported as an inline style and will be ignored. ` +
            'Only CSS declarations (property: value) are supported in React Native.'
        );
      } else {
        pairs.push([prop, value]);
      }
    }

    i = j + 1; // skip past the semicolon
  }

  return pairs;
}

let generated: Dict<any> = {};

/** Clear the cached CSS-to-style-object mappings. Useful in tests or long-running RN apps with highly dynamic styles. */
export const resetStyleCache = (): void => {
  generated = {};
};

/**
 * Parse flat CSS into a style object via css-to-react-native, with caching.
 */
export function cssToStyleObject(flatCSS: string, styleSheet: StyleSheet) {
  const hash = generateComponentId(flatCSS);

  if (!generated[hash]) {
    const declPairs: [string, string][] = [];
    for (const [prop, value] of parseCSSDeclarations(flatCSS)) {
      if (RN_UNSUPPORTED_VALUES.includes(value)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[styled-components/native] The value "${value}" for property "${prop}" is not supported in React Native and will be ignored.`
          );
        }
      } else {
        declPairs.push([prop, value]);
      }
    }

    // RN does not support differing border values for Image components (but does for View).
    // https://github.com/styled-components/styled-components/issues/4181
    const styleObject = transformDeclPairs(declPairs, ['borderWidth', 'borderColor']);

    generated[hash] = styleSheet.create({ generated: styleObject }).generated;
  }
  return generated[hash];
}

/**
 * InlineStyle takes arbitrary CSS and generates a flat object
 */
export default function makeInlineStyleClass<Props extends object>(styleSheet: StyleSheet) {
  const InlineStyle: IInlineStyleConstructor<Props> = class InlineStyle implements IInlineStyle<Props> {
    rules: RuleSet<Props>;

    constructor(rules: RuleSet<Props>) {
      this.rules = rules;
    }

    generateStyleObject(executionContext: ExecutionContext & Props) {
      const flatCSS = joinStringArray(
        flatten(this.rules as RuleSet<object>, executionContext) as string[]
      );
      return cssToStyleObject(flatCSS, styleSheet);
    }
  };

  return InlineStyle;
}
