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
        console.warn(`Over ${LIMIT} classes were generated for component ${displayName}. ` +
          'Consider using style property for frequently changed styles.\n' +
          'Example:\n' +
          '  const StyledComp = styled.div`width: 100%;`\n' +
          '  <StyledComp style={{ background: background }} />')
        warningSeen = true
        generatedClasses = {}
      }
    }
  }
}
