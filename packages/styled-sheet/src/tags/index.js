// @flow

import { IS_BROWSER, DISABLE_SPEEDY } from '../constants';
import VirtualTag from './VirtualTag';
import SpeedyTag from './SpeedyTag';
import TextTag from './TextTag';
import RuleGroupTag from './RuleGroupTag';

let DefaultTag;
if (IS_BROWSER && DISABLE_SPEEDY) {
  DefaultTag = TextTag;
} else if (IS_BROWSER) {
  DefaultTag = SpeedyTag;
} else {
  DefaultTag = VirtualTag;
}

export { DefaultTag, VirtualTag, SpeedyTag, TextTag, RuleGroupTag };
