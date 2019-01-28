// @flow

import { cssMarkerRe } from './utils';

type ExtractedRuleGroup = {
  contents: string,
  group: number,
  name: string
};

// eslint-disable-next-line no-undef
const makeRuleGroup = (contents: string, match: RegExp$matchResult): ExtractedRuleGroup => ({
  contents,
  group: parseInt(match[1], 10),
  name: match[2]
});

// eslint-disable-next-line no-undef
const getIndexFromMatch = (match: RegExp$matchResult) => match.index + match[0].length;

const extractRuleGroups = (css: string): ExtractedRuleGroup[] => {
  cssMarkerRe.lastIndex = 0;

  const ruleGroups: ExtractedRuleGroup[] = [];

  let lastMatch = cssMarkerRe.exec(css);
  if (lastMatch === null) {
    return ruleGroups;
  }

  let match;
  while ((match = cssMarkerRe.exec(css)) !== null) {
    // $FlowFixMe
    const contents = css.slice(getIndexFromMatch(lastMatch), match.index)
    // $FlowFixMe
    ruleGroups.push(makeRuleGroup(contents, lastMatch));

    lastMatch = match;
  }

  // $FlowFixMe
  const contents = css.slice(getIndexFromMatch(lastMatch));
  // $FlowFixMe
  ruleGroups.push(makeRuleGroup(contents, lastMatch));

  return ruleGroups;
};

export default extractRuleGroups;
