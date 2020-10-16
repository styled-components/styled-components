import { IStyledComponent, IStyledNativeComponent } from '../types';

export default function isTag(
  target: IStyledComponent['target'] | IStyledNativeComponent['target']
) {
  return (
    typeof target === 'string' &&
    (process.env.NODE_ENV !== 'production'
      ? target.charAt(0) === target.charAt(0).toLowerCase()
      : true)
  );
}
