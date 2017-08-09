import * as React from "react";
import styled from "./mytheme-styled-components";

interface Props {
    text?: string;
}

const StatelessComponent = (props: Props) =>
    <div>{props.text}</div>;
const StyledStatelessComponent = styled(StatelessComponent)``;
const StyledStatelessComponent2 = styled(StyledStatelessComponent)``;

<StatelessComponent />;
<StatelessComponent text="test" />;
<StyledStatelessComponent text="test" />;
<StyledStatelessComponent2 text="test" />;

class PureComponent extends React.PureComponent<Props, {}> {
    public render() {
        return <div>{this.props.text}</div>;
    }
}

const StyledPureComponent = styled(PureComponent)``;
const StyledPureComponent2 = styled(StyledPureComponent)``;

<PureComponent />;
<PureComponent text="test" />;
<StyledPureComponent text="test" />;
<StyledPureComponent2 text="test" />;

class ClassicComponent extends React.Component<Props, {}> {
    public render() {
        return <div>{this.props.text}</div>;
    }
}

const StyledClassicComponent = styled(ClassicComponent)``;
const StyledClassicComponent2 = styled(StyledClassicComponent)``;

<StyledClassicComponent />;
<StyledClassicComponent text="test" />;
<StyledPureComponent text="test" />;
<StyledClassicComponent2 text="test" />;
