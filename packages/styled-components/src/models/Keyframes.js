// @flow
import StyleSheet from '../sheet';
import throwStyledError from '../utils/error';

export default class Keyframes {
  id: string;

  name: string;

  stringifyArgs: string[];

  constructor(name: string, stringifyArgs: string[]) {
    this.name = name;
    this.id = `sc-keyframes-${name}`;

    this.stringifyArgs = stringifyArgs;
  }

  inject = (styleSheet: StyleSheet) => {
    if (!styleSheet.hasNameForId(this.id, this.name)) {
      styleSheet.insertRules(
        this.id,
        this.name,
        styleSheet.options.stringifier(...this.stringifyArgs)
      );
    }
  };

  toString = () => {
    return throwStyledError(12, String(this.name));
  };

  getName() {
    return this.name;
  }
}
