// @flow
export default function isStyledComponent(target: any): boolean {
  return target && typeof target.styledComponentId === 'string';
}
