// @flow

const LIMIT = 200

export default (displayName: string) => {
  let generatedClasses = {}
  let warningSeen = false

  return (className: string) => {
    if (!warningSeen) {
      generatedClasses[className] = true
      if (Object.keys(generatedClasses).length >= LIMIT) {
        // Unable to find latestRule in test environment.
        /* eslint-disable no-console, prefer-template */
        console.warn(
          `Over ${LIMIT} classes were generated for component ${displayName}. \n` +
            'Consider using the attrs method, together with a style object for frequently changed styles.\n' +
            'Example:\n' +
            '  const Component = styled.div.attrs({\n' +
            '    style: ({ background }) => ({\n' +
            '      background,\n' +
            '    }),\n' +
            '  })`width: 100%;`\n\n' +
            '  <Component />'
        )
        warningSeen = true
        generatedClasses = {}
      }
    }
  }
}
