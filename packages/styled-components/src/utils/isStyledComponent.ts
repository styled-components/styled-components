import { StyledComponentBrand } from '../types';

export default function isStyledComponent(target: any): target is StyledComponentBrand {
  return typeof target === 'object' && 'styledComponentId' in target;
}
