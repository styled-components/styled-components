// @flow
/* eslint-disable import/no-unresolved */
import transformDeclPairs from 'css-to-react-native';

import generateComponentId from '../utils/generateComponentId';
import type { RuleSet, StyleSheet } from '../types';
import flatten from '../utils/flatten';
// $FlowFixMe
import parse from '../vendor/postcss-safe-parser/parse';

let generated = {};

export const resetStyleCache = () => {
  generated = {};
};

function kebab2camel(string: string) {
  return string.replace(/-./g, x=>x.toUpperCase()[1])
};

/** polyfill for Node < 12 */
function matchAll(str) {
  return re => {
    const matches = []
    let groups
    // eslint-disable-next-line no-cond-assign
    while (groups = re.exec(str)) {
      matches.push(groups)
    }
    return matches
  }
}

/** polyfill for Node < 12 */
function flat(array, depth = 1) {
  if (depth < 1 || !Array.isArray(array)) {
    return array;
  }
  return array.reduce(
    (result, current) => result.concat(flat(current, depth - 1)),
    []
  )
}

/*
 InlineStyle takes arbitrary CSS and generates a flat object
 */
export default (styleSheet: StyleSheet) => {
  class InlineStyle {
    rules: RuleSet;

    constructor(rules: RuleSet) {
      this.rules = rules;
    }

    generateStyleObject(executionContext: Object, unitsInformation: Object = { em: [], vh: [], vw: [], fontSizeInEm: false }) {
      const flatCSS = flatten(this.rules, executionContext).join('');

      const hash = generateComponentId(flatCSS);
      const usesEM = flatCSS.match(/\d\.?em[\s;}]/m)
      // Despite the hash being already generated, we still need to handle em values
      if (!generated[hash] || usesEM) {
        const root = parse(flatCSS);
        const declPairs = [];
        root.each(node => {
          if (node.type === 'decl') {
            const unitsRegexp = /\d+(\.\d+)?([a-z%]+)?/ig // Match the units of the values
            const groups = matchAll(node.value)(unitsRegexp)
            /** The array of the units used in the style value in order */
            const units = groups.map(group => group[2])
            /** Strip the unit from the value * */
            const stripUnit = (index: number) => {
              // eslint-disable-next-line no-param-reassign
              node.value = node.value.substring(0, groups[index].index) + node.value.substring(groups[index].index).replace(units[index], 'px')
            }

            /** These are the indexes of the units that should be taken care of */
            const specialUnitsIndexes = units.map((unit, index) => index).filter(index => ['rem', 'em', 'vh', 'vw', 'vmin', 'vmax'].includes(units[index]))
            // Special treatment for special units
            if(specialUnitsIndexes.length>0) {
              
              // Handle properties that can receive multiple unit values
              if(['padding', 'margin'].includes(node.prop)) {
                /** Add the sides we want to apply the special unit property to */
                const addSides = (sides: string[], unit: string) => {
                  sides.forEach(side => unitsInformation[unit].push(node.prop+side))
                }
                // Apply the special unit property to the sides according to the number of inputs
                let sides
                switch(units.length) {
                  case 1: sides = [['Top', 'Bottom', 'Right', 'Left']]; break
                  case 2: sides = [['Top', 'Bottom'], ['Right', 'Left']]; break
                  case 3: sides = ['Top', ['Right', 'Left'], 'Bottom']; break
                  default: sides = ['Top', 'Right', 'Bottom', 'Left']; break
                }
                // This way, if the units of index 0 and 1 among 3 are using em, we mark the sides Top, Left and Right
                specialUnitsIndexes.forEach(index => addSides(flat(sides[index]), units[index]))
                // We strip off all the special units
                specialUnitsIndexes.forEach(index => stripUnit(index))
              }

              // Handle properties that can receive a unit value among a list of other values
              else if(['font', 'border', 'flex', 'border-left', 'border-right', 'border-top', 'border-bottom'].includes(node.prop)) {
                let property
                switch(node.prop) {
                  case 'font': property = 'font-size'; break
                  case 'flex': property = 'flex-basis'; break
                  default: property = `${node.prop}-width`; break
                }
                // We strip the special units and mark them for later treatment
                stripUnit(0)
                unitsInformation[units[0]].push(kebab2camel(property))
                // We need a special management for font sizes when expressed in em
                // eslint-disable-next-line no-param-reassign
                if(property==='font-size') unitsInformation.fontSizeInEm = true
              }

              // Handle the other properties
              else {
                // We strip the special units and mark them for later treatment
                stripUnit(0)
                unitsInformation[units[0]].push(kebab2camel(node.prop))
                // We need a special management for font sizes when expressed in em
                // eslint-disable-next-line no-param-reassign
                if(node.prop==='font-size') unitsInformation.fontSizeInEm = true
              }
            }

            declPairs.push([node.prop, node.value]);
          } else if (process.env.NODE_ENV !== 'production' && node.type !== 'comment') {
            /* eslint-disable no-console */
            console.warn(`Node of type ${node.type} not supported as an inline style`);
          }
        });
        // RN currently does not support differing values for the corner radii of Image
        // components (but does for View). It is almost impossible to tell whether we'll have
        // support, so we'll just disable multiple values here.
        // https://github.com/styled-components/css-to-react-native/issues/11
        const styleObject = transformDeclPairs(declPairs, [
          'borderRadius',
          'borderWidth',
          'borderColor',
          'borderStyle',
        ]);
        // If the style was already generated we can still use it. We just needed the previous step to handle special units
        if(!generated[hash]) {
          const styles = styleSheet.create({
            generated: styleObject,
          });
          generated[hash] = styles.generated;
        }
      }
      return generated[hash];
    }
  }

  return InlineStyle;
};
