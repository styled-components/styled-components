// @flow

export const LIMIT = 200;

export default (displayName: string, componentId: string) => {
  let generatedClasses = {};
  let warningSeen = false;

  return (className: string) => {
    if (!warningSeen) {
      generatedClasses[className] = true;
      if (Object.keys(generatedClasses).length >= LIMIT) {
        // Unable to find latestRule in test environment.
        /* eslint-disable no-console, prefer-template */
        const parsedIdString = componentId ? ` with the id of "${componentId}"` : '';

        console.warn(
          `Over ${LIMIT} classes were generated for component ${displayName}${parsedIdString}.\n` +
            'Consider using the attrs method, together with a style object for frequently changed styles.\n' +
            'Example:\n' +
            '  const Component = styled.div.attrs(props => ({\n' +
            '    style: {\n' +
            '      background: props.background,\n' +
            '    },\n' +
            '  }))`width: 100%;`\n\n' +
            '  <Component />'
        );
        warningSeen = true;
        generatedClasses = {};
      }
    }
  };
};
