// @flow
export function isStyledComponent(target: any): boolean {
  return target && typeof target.styledComponentId === 'string';
}
