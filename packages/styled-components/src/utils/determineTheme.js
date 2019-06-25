// @flow
import { EMPTY_OBJECT } from './empties';

type Props = {
  theme?: any,
};

export default (props: Props, providedTheme: any, defaultProps: any = EMPTY_OBJECT) => {
  return (props.theme !== defaultProps.theme && props.theme) || providedTheme || defaultProps.theme;
};
