import transformDeclPairs from 'css-to-react-native';
import { parse } from 'postcss';
import {
  ExtensibleObject,
  IInlineStyle,
  IInlineStyleConstructor,
  RuleSet,
  StyleSheet,
} from '../types';
import flatten from '../utils/flatten';
import generateComponentId from '../utils/generateComponentId';

let generated: ExtensibleObject = {};

export const resetStyleCache = (): void => {
  generated = {};
};

/**
 * InlineStyle takes arbitrary CSS and generates a flat object
 */
export default function makeInlineStyleClass(styleSheet: StyleSheet): IInlineStyleConstructor {
  const InlineStyle: IInlineStyleConstructor = class InlineStyle implements IInlineStyle {
    rules: RuleSet;

    constructor(rules: RuleSet) {
      this.rules = rules;
    }

    generateStyleObject(executionContext: ExtensibleObject) {
      // keyframes, functions, and component selectors are not allowed for React Native
      const flatCSS = (flatten(this.rules, executionContext) as string[]).join('');
      const hash = generateComponentId(flatCSS);

      if (!generated[hash]) {
        const root = parse(flatCSS);
        const declPairs: [string, string][] = [];

        root.each(node => {
          if (node.type === 'decl') {
            declPairs.push([node.prop, node.value]);
          } else if (process.env.NODE_ENV !== 'production' && node.type !== 'comment') {
            /* eslint-disable no-console */
            console.warn(`Node of type ${node.type} not supported as an inline style`);
          }
        });

        const styleObject = transformDeclPairs(declPairs);
        const styles = styleSheet.create({
          generated: styleObject,
        });

        generated[hash] = styles.generated;
      }
      return generated[hash];
    }
  };

  return InlineStyle;
}
