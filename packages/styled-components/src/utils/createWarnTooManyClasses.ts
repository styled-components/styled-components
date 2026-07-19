import { warnOnce } from './warnOnce';

export const LIMIT = 200;

export default (displayName: string, componentId: string) => {
  let generatedClasses = new Set<string>();
  let warningSeen = false;

  return (className: string) => {
    if (!warningSeen) {
      generatedClasses.add(className);
      if (generatedClasses.size >= LIMIT) {
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
        generatedClasses = new Set();
      }
    }
  };
};
