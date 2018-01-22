import * as React from "react";
import styled, { css } from "../..";

// Props and themes are well testet within the other cases.
// We just need to know that they are passed to the function
// properly. A single prop will suffice.
interface Props {
  size: string;
}

const functionReturningStyleObject = (props: Props) => ({
  padding: props.size === "big" ? "10px" : 2
});

const Box = styled.div`
  ${functionReturningStyleObject}
  ${{
    backgroundColor: "red",

    // Supports nested objects (pseudo selectors, media queries, etc)
    "@media screen and (min-width: 800px)": {
      backgroundColor: "blue",
    },

    fontSize: 2
}}`;

<Box size="big" />;
