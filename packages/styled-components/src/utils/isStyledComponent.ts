import { IStyledComponent } from '../types';

export default function isStyledComponent(target: any): target is IStyledComponent<any> {
  return typeof target === 'object' && 'styledComponentId' in target;
}
