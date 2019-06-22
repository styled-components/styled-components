// @flow

export const LIMIT = 50;

export default (displayName: string) => {
  let generatedClasses = {};
  let warningSeen = false;

  return (className: string) => {
    if (!warningSeen) {
      generatedClasses[className] = true;
      if (Object.keys(generatedClasses).length >= LIMIT) {
        // Unable to find latestRule in test environment.
        /* eslint-disable no-console, prefer-template */
        console.warn(
          `Over ${LIMIT} classes were generated for component ${displayName}. This happens when some of the props you use for styling have many potential values and we need to make a new CSS class for each variant. Over time the stylesheet will grow and slow down your app.\n` +
            'For these particular CSS rules with high dynamicity, consider using the attrs() method together with a style object.\n' +
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
