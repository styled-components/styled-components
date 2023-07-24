import { DefaultTheme, ExecutionProps } from '../types';
import { EMPTY_OBJECT } from './empties';

export default function determineTheme<Theme extends object = DefaultTheme>(
  props: ExecutionProps<Theme>,
  providedTheme?: Theme,
  defaultProps: { theme?: Theme } = EMPTY_OBJECT
): Theme | undefined {
  return (props.theme !== defaultProps.theme && props.theme) || providedTheme || defaultProps.theme;
}
