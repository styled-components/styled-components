// @flow
import Input from '../postcss/input';

import SafeParser from './safe-parser';

export default function safeParse(css, opts) {
  const input = new Input(css, opts);

  const parser = new SafeParser(input);
  parser.tokenize();
  parser.loop();

  return parser.root;
}
