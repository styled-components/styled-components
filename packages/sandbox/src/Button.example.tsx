import Link from 'next/link';
import styled, { css } from 'styled-components';

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

const MyLink = styled(Link)`
  color: palevioletred;
  font-weight: bold;
`;

const LinkWithPredefinedHref = styled(Link).attrs({
  href: '/help',
})`
  color: palevioletred;
  font-weight: bold;
`;

const LinkWithRequiredHref = styled(Link)``;

export default function ButtonExample() {
  return (
    <>
      <Button onClick={() => alert('Clicked!')}>Normal Button</Button>
      <MyLink as="button">
        This link should not require a href props because the button html element does not
      </MyLink>
      {/* @ts-expect-error: href is required  */}
      <LinkWithRequiredHref>
        This link should require a href prop because next/link does
      </LinkWithRequiredHref>
      <LinkWithPredefinedHref>
        This link should not require a href prop because one is passed by .attrs
      </LinkWithPredefinedHref>
      <Button $primary onClick={() => alert('Clicked!')}>
        Primary Button
      </Button>
    </>
  );
}
