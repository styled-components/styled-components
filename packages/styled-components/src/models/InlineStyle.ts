import transformDeclPairs from 'css-to-react-native';
import { parse } from 'postcss';
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

let generated: Dict<any> = {};

export const resetStyleCache = (): void => {
  generated = {};
};

/**
 * InlineStyle takes arbitrary CSS and generates a flat object
 */
export default function makeInlineStyleClass<Props extends object>(styleSheet: StyleSheet) {
  const InlineStyle: IInlineStyleConstructor<Props> = class InlineStyle
    implements IInlineStyle<Props>
  {
    rules: RuleSet<Props>;

    constructor(rules: RuleSet<Props>) {
      this.rules = rules;
    }

    generateStyleObject(executionContext: ExecutionContext & Props) {
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
