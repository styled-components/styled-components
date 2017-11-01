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

const H2 = H1.withComponent("h2");
const abbr = H1.withComponent("abbr");

const AnchorHeading = H1.withComponent("a");

class LinkedHeading extends React.Component {
  render() {
    return <AnchorHeading href="https://example.com">Hello World</AnchorHeading>;
  }
}

type RandomProps = {
  min: number;
  max: number;
  className?: string;
};

class Random extends React.Component<RandomProps> {
  render() {
    const i = getRandomInt(this.props.min, this.props.max);

    switch (i) {
      case 1:
        return <h1 className={this.props.className}>Hello World</h1>;
      case 2:
        return <h2 className={this.props.className}>Hello World</h2>;
      case 3:
        return <h3 className={this.props.className}>Hello World</h3>;
      case 4:
        return <h4 className={this.props.className}>Hello World</h4>;
      case 5:
        return <h5 className={this.props.className}>Hello World</h5>;
      case 6:
        return <h6 className={this.props.className}>Hello World</h6>;
      default:
        return null;
    }
  }
}

const RandomHeading = H1.withComponent(Random);

const RandomHeadingContainer: React.SFC = () =>
  <RandomHeading
    min={1}
    max={6}
  />;
