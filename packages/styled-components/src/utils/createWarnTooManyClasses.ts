import type { Dict } from '../types';
import { warnOnce } from './warnOnce';

export const LIMIT = 200;

export default (displayName: string, componentId: string) => {
  let generatedClasses: Dict<any> = {};
  let warningSeen = false;

  return (className: string) => {
    if (!warningSeen) {
      generatedClasses[className] = true;
      if (Object.keys(generatedClasses).length >= LIMIT) {
        const parsedIdString = componentId ? ` with the id of "${componentId}"` : '';
        warnOnce(
          'too-many-classes',
          `over ${LIMIT} classes were generated for component ${displayName}${parsedIdString}.
Consider using the attrs method, together with a style object for frequently changed styles.
Example:
  const Component = styled.div.attrs(props => ({
    style: {
      background: props.background,
    },
  }))\`width: 100%;\`

  <Component />`,
          componentId
        );
        warningSeen = true;
        generatedClasses = {};
      }
    }
  };
};
