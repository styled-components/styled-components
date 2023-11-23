import path from 'path';
import { parse } from 'react-docgen-typescript';

const testComponentsPath = path.resolve(__dirname, './docgen-test-components.tsx')

describe('react-docgen-typescript', () => {
  it('infers correct props from Button component', () => {
    const docs = parse(testComponentsPath)

    const buttonDoc = docs.find((component) => component.displayName === 'Button')

    expect(Object.keys(buttonDoc!.props)).toContain('size')
  })

  it('infers correct props from StyledButton component', () => {
    const docs = parse(testComponentsPath)

    const styledButtonDoc = docs.find((component) => component.displayName === 'StyledButton')

    expect(Object.keys(styledButtonDoc!.props)).toContain('size')
  })
});
