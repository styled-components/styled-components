import * as React from "react";
import styled from "../..";

interface OptionalProps {
    text?: string;
}
interface ThemedOptionalProps extends OptionalProps {
    theme: any;
}
interface RequiredProps {
    text: string;
}
interface ThemedRequiredProps extends RequiredProps {
    theme: any;
}

declare const theme: any;

// Tests of stateless functional components
function statelessFunctionalComponents() {

    function optionalProps() {
        const Component = (props: OptionalProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component />;
        <Component text="test" />;
        <StyledComponent text="test" />;
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent text="test" />;
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function optionalPropsWithRequiredTheme() {
        const Component = (props: ThemedOptionalProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component theme={theme} />; // theme is required
        <Component text="test" theme={theme} />; // theme is required
        <StyledComponent text="test" />; // theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent text="test" />; // theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function requiredProps() {
        const Component = (props: RequiredProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text required
        <Component text="test" />;
        // <StyledComponent />; // text required
        <StyledComponent text="test" />;
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        // <StyledStyledComponent />; // text allowed
        <StyledStyledComponent text="test" />;
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function requiredPropsWithRequiredTheme() {
        const Component = (props: ThemedRequiredProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component theme={theme} />; // theme is required
        <Component text="test" theme={theme} />; // theme is required
        // <StyledComponent />; // text required
        <StyledComponent text="test" />; // theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        // <StyledStyledComponent />; // text required
        <StyledStyledComponent text="test" />; // theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

}

// Tests of pure components
function pureComponents() {

    function optionalProps() {
        class Component extends React.PureComponent<OptionalProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component />;
        <Component text="test" />;
        <StyledComponent text="test" />;
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent text="test" />;
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function optionalPropsWithRequiredTheme() {
        class Component extends React.PureComponent<ThemedOptionalProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component theme={theme} />; // theme is required
        <Component text="test" theme={theme} />; // theme is required
        <StyledComponent text="test" />; // theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent text="test" />; // theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function requiredProps() {
        class Component extends React.PureComponent<RequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text required
        <Component text="test" />;
        // <StyledComponent />; // text required
        <StyledComponent text="test" />;
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        // <StyledStyledComponent />; // text allowed
        <StyledStyledComponent text="test" />;
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function requiredPropsWithRequiredTheme() {
        class Component extends React.PureComponent<ThemedRequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component theme={theme} />; // theme is required
        <Component text="test" theme={theme} />; // theme is required
        // <StyledComponent />; // text required
        <StyledComponent text="test" />; // theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        // <StyledStyledComponent />; // text required
        <StyledStyledComponent text="test" />; // theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }
}

// Tests of classic components
function classicComponents() {

    function optionalProps() {
        class Component extends React.Component<OptionalProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component />;
        <Component text="test" />;
        <StyledComponent text="test" />;
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent text="test" />;
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function optionalPropsWithRequiredTheme() {
        class Component extends React.Component<ThemedOptionalProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component theme={theme} />; // theme is required
        <Component text="test" theme={theme} />; // theme is required
        <StyledComponent text="test" />; // theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent text="test" />; // theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function requiredProps() {
        class Component extends React.Component<RequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text required
        <Component text="test" />;
        // <StyledComponent />; // text required
        <StyledComponent text="test" />;
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        // <StyledStyledComponent />; // text allowed
        <StyledStyledComponent text="test" />;
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function requiredPropsWithRequiredTheme() {
        class Component extends React.Component<ThemedRequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component theme={theme} />; // theme is required
        <Component text="test" theme={theme} />; // theme is required
        // <StyledComponent />; // text required
        <StyledComponent text="test" />; // theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        // <StyledStyledComponent />; // text required
        <StyledStyledComponent text="test" />; // theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }
}
