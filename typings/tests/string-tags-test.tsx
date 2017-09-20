import * as React from "react";

import styled from "../..";

// Create a <Link> react component that renders an <a> which is
// centered, palevioletred and sized at 1.5em
const Link = styled.a`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

// A Link instance should be backed by an HTMLAnchorElement
const MyComponent = () =>
  <Link
    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => undefined}
  />;

// Create a <LinkFromString> react component that renders an <a> which is
// centered, palevioletred and sized at 1.5em
const LinkFromString = styled("a")`
  font-size: 1.5em;
  text-align: center;
  color: palevioletred;
`;

// A LinkFromString instance should be backed by an HTMLAnchorElement
const MyOtherComponent = () =>
  <LinkFromString
    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => undefined}
  />;

// Create a <LinkFromStringWithProps> react component that renders an <a>
// which takes extra props
type LinkProps = {canClick: boolean};
const LinkFromStringWithProps = styled("a")`
  font-size: 1.5em;
  text-align: center;
  color: ${(a: LinkProps) => a.canClick ? "palevioletred" : "gray"};
`;

// A LinkFromStringWithProps instance should be backed by an HTMLAnchorElement
const MyOtherComponentWithProps = () =>
  <LinkFromStringWithProps
    canClick={false}
    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => undefined}
  />;

// Create a <LinkFromStringWithPropsAndGenerics> react component that renders an <a>
// which takes extra props passed as a generic type argument
const LinkFromStringWithPropsAndGenerics = styled<LinkProps, "a">("a")`
  font-size: 1.5em;
  text-align: center;
  color: ${a => a.canClick ? "palevioletred" : "gray"};
`;

// A LinkFromStringWithPropsAndGenerics instance should be backed by an HTMLAnchorElement
const MyOtherComponentWithPropsAndGenerics = () =>
  <LinkFromStringWithPropsAndGenerics
    canClick={false}
    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => undefined}
  />;
