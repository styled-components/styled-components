// @flow
export default function isStyledComponent(target: any): boolean %checks {
  return target && typeof target.styledComponentId === 'string';
}
