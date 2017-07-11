import * as React from "react";

import styled, { withTheme } from "../..";

interface Props {
    theme: {
        color: string;
    };
    text: string;
}

const Component = (props: Props) => <div style={{color: props.theme.color}}>{props.text}</div>;

const ComponentWithTheme = withTheme(Component);

<ComponentWithTheme text={"hi"} />; // ok
<ComponentWithTheme text={"hi"} theme={{ color: "red" }} />; // ok
