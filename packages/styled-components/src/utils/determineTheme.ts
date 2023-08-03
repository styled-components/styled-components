import { DefaultTheme, ExecutionProps } from '../types';
import { EMPTY_OBJECT } from './empties';

export default function determineTheme(
  props: ExecutionProps,
  providedTheme?: DefaultTheme | undefined,
  defaultProps: { theme?: DefaultTheme | undefined } = EMPTY_OBJECT
): DefaultTheme | undefined {
  return (props.theme !== defaultProps.theme && props.theme) || providedTheme || defaultProps.theme;
}
