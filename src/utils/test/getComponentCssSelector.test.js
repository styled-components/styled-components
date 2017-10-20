// @flow
import getComponentCssSelector from '../getComponentCssSelector'

describe('getComponentCssSelector', () => {
  const testComponentName = 'testComponent'
  const testNamespaceClass = 'moreSpecific'

  it('returns the name as selector if options are not provided', () => {
    expect(getComponentCssSelector(testComponentName)).toEqual(`.${testComponentName}`)
  })

  it('returns the name if the namespace class is not defined on options', () => {
    expect(getComponentCssSelector(testComponentName, { displayName: 'test' })).toEqual(
      `.${testComponentName}`,
    )
  })

  it('returns the name prepended with the namespace class', () => {
    expect(
      getComponentCssSelector(testComponentName, { namespaceClasses: testNamespaceClass }),
    ).toEqual(`.${testNamespaceClass} .${testComponentName}`)
  })

  it('returns the name prepended with a list of namespace classes', () => {
    const testNamespaceClasses = ['aLittleSpecific', 'moreSpecific', 'reallySpecific']
    expect(
      getComponentCssSelector(testComponentName, { namespaceClasses: testNamespaceClasses })
    ).toEqual(`.aLittleSpecific .moreSpecific .reallySpecific .${testComponentName}`)
  });
})
