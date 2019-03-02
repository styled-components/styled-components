export default function mostRestrictedComposition(ruleA: string, ruleB: string) {
  if (ruleA === 'none' || ruleB === 'none') {
    return 'none';
  }
  if (ruleA === 'layout' || ruleB === 'layout') {
    return 'layout';
  }
  return 'appearance';
}
