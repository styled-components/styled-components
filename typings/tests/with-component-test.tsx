import * as React from "react";

import styled from "../..";

const H1 = styled.h1`
  color: palevioletred;
  font-size: 1em;
`;

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

class Random extends React.Component<any, any> {
  render() {
    const i = getRandomInt(1, 6);

    switch (i) {
      case 1:
        return <h1>Hello World</h1>;
      case 2:
        return <h2>Hello World</h2>;
      case 3:
        return <h3>Hello World</h3>;
      case 4:
        return <h4>Hello World</h4>;
      case 5:
        return <h5>Hello World</h5>;
      case 6:
        return <h6>Hello World</h6>;
      default:
        return null;
    }
  }
}

const H2 = H1.withComponent("h2");
const abbr = H1.withComponent("abbr");

const Anchor = H1.withComponent("a");
const AnchorContainer = () => (
  <Anchor href="https://example.com">withComponent Anchor </Anchor>
);

const RandomHeading = H1.withComponent(Random);

const CompA: React.SFC<{ a: number; className?: string }> = ({ className }) => (
  <div className={className} />
);
const CompB: React.SFC<{ b: number; className?: string }> = ({ className }) => (
  <div className={className} />
);
const StyledA = styled(CompA)`
  color: ${(props: { color: string }) => props.color};
`;

const FirstStyledA = styled(StyledA).attrs({ a: 1 })``;
const FirstStyledB = FirstStyledA.withComponent(CompB);

const test = () => [
  <FirstStyledA color={"black"} />,
  <FirstStyledB b={2} color={"black"} />,
];
