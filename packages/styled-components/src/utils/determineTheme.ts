import { ExecutionProps } from '../types';
import { EMPTY_OBJECT } from './empties';

export default function determineTheme(
  props: ExecutionProps,
  providedTheme: any,
  defaultProps: any = EMPTY_OBJECT
) {
  return (props.theme && props.theme !== defaultProps.theme) || providedTheme || defaultProps.theme;
}
