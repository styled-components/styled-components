import { StyledComponentBrand } from '../types';

const styledComponentRegistry = new WeakSet<object>();

export function registerStyledComponent(component: object): void {
  styledComponentRegistry.add(component);
}

export default function isStyledComponent(target: any): target is StyledComponentBrand {
  return (
    (typeof target === 'object' || typeof target === 'function') &&
    styledComponentRegistry.has(target)
  );
}
