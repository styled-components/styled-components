import { IStyledComponent } from '../types';

export default function isStyledComponent(target: any): target is IStyledComponent<'web', any> {
  return typeof target === 'object' && 'styledComponentId' in target;
}
