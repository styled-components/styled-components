import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import styled, { css } from '../../styled-components/src/index';

const Box = styled.div<{ background?: string; padding?: number; margin?: number }>`
  padding: ${props => props.padding}px;
  margin: ${props => props.margin}px;
  background: ${props => props.background}} ;
`;

const Text = styled.span<{ fontColor?: string; fontSize?: number }>`
  color: ${props => props.fontColor};
  font-size: ${props => props.fontSize}px;
`;

const Anchor = styled.a`
  text-decoration: none;
`;

const Flex = styled.div<{ direction?: string; align?: string; justify?: string }>`
  display: flex;
  flex-direction: ${props => props.direction};
  align-items: ${props => props.align};
  justify-content: ${props => props.justify};
`;

const Button = styled.button<{ primary?: boolean }>`
  border-radius: 5px;
  background: transparent;
  color: palevioletred;
  border: 2px solid palevioletred;
  cursor: pointer;

  ${props =>
    props.primary &&
    css`
      background: palevioletred;
      color: white;
    `};
`;

export function PolymorphExample() {
  return (
    <Box background="white" padding={20}>
      <Text as="div">PolymorphExample</Text>
      <Flex direction="column" align="center" justify="center" mix={Box} padding={8}>
        <Button primary as={[Anchor, NextLink]} href="/" mix={Text} fontColor="red" fontSize={14}>
          Primary Link
        </Button>
        <Button onClick={() => alert('Clicked!')} mix={Box} padding={8} margin={10}>
          Primary Button
        </Button>
      </Flex>
    </Box>
  );
}

export default dynamic(() => Promise.resolve(PolymorphExample), {
  ssr: false,
});
