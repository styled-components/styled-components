// @flow
import Stringifier from './stringifier';

export default function stringify(node, builder) {
  const str = new Stringifier(builder);
  str.stringify(node);
}
