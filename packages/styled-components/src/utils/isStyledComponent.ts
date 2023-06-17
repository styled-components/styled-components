import { IStyledComponent } from '../types';

export default function isStyledComponent(target: any): target is IStyledComponent<'web', any, any> {
  return typeof target === 'object' && 'styledComponentId' in target;
}
