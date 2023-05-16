import styled, { css } from '../../styled-components/src';
import { VeryLargeUnionType } from './veryLargeUnionType';

const Button = styled.button<{ $primary?: boolean }>`
  font-size: 16px;
  border-radius: 5px;
  padding: 0.25em 1em;
  margin: 1em 1em;
  background: transparent;
  color: palevioletred;
  border: 2px solid palevioletred;
  cursor: pointer;

  ${props =>
    props.$primary &&
    css`
      background: palevioletred;
      color: white;
    `};
`;

export default function ButtonExample() {
  return (
    <>
      <Button onClick={() => alert('Clicked!')}>Normal Button</Button>
      <Button $primary onClick={() => alert('Clicked!')}>
        Primary Button
      </Button>
    </>
  );
}

interface UnstyledComponentProps {
  foo: VeryLargeUnionType; // Comment out this line to compare performance
}

const UnstyledComponent = (_props: UnstyledComponentProps) => {
  return <></>;
};

const StyledComponent = styled(UnstyledComponent)`
  // Multiple template strings helps illustrate perf issue
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
  color: ${props => props.theme.waz};
`;

const InheritedStyledComponent = styled(StyledComponent)``;

const DivWithoutProps = styled.div`
  ${StyledComponent} {
    display: block;
  }
`;

const DivWithProps = styled.div<{ waz: number }>`
  ${StyledComponent} {
    display: block;
  }

  color: ${props => props.waz};
`;

const InheritedDivWithProps = styled(DivWithProps)`
  color: ${props => props.waz};
`;

export const Example = () => {
  return (
    <>
      Notice here ts thinks DivWithoutProps mistakenly needs the "foo" prop
      <DivWithoutProps>test</DivWithoutProps>
      <DivWithProps waz={42}>test</DivWithProps>
      <InheritedDivWithProps waz={42}>test</InheritedDivWithProps>
      <StyledComponent foo="add-clip" />
      <InheritedStyledComponent foo="add-clip" />
    </>
  );
};
