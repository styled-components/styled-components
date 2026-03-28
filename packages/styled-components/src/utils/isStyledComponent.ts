import { StyledComponentBrand } from '../types';

/** Type guard that returns true if the target is a styled component. */
export default function isStyledComponent(target: any): target is StyledComponentBrand {
  return typeof target === 'object' && 'styledComponentId' in target;
}
