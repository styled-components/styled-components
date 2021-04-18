import { ExtensibleObject } from '../types';
import { EMPTY_OBJECT } from './empties';

export default function determineTheme(
  props: ExtensibleObject,
  providedTheme: any,
  defaultProps: any = EMPTY_OBJECT
) {
  return (props.theme !== defaultProps.theme && props.theme) || providedTheme || defaultProps.theme;
}
