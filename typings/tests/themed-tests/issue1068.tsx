import * as React from "react";
import styled, { MyTheme } from "./mytheme-styled-components";

interface OptionalProps {
    text?: string;
}
interface IndexedProps {
    [prop: string]: any;
}
interface ThemedOptionalProps extends OptionalProps {
    theme: MyTheme;
}
interface RequiredProps {
    text: string;
}
interface ThemedRequiredProps extends RequiredProps {
    theme: MyTheme;
}
interface IndexedAndRequiredProps extends IndexedProps, RequiredProps { }
interface ThemedIndexedProps extends IndexedProps {
    theme: MyTheme;
}
interface ThemedIndexedAndRequiredProps extends IndexedProps, RequiredProps {
    theme: MyTheme;
}

declare const theme: MyTheme;

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

    function indexedProps() {
        const Component = (props: IndexedProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component />; // text is optional through index signature
        <Component text="test" />; // text is allowed through index signature
        <StyledComponent />; // text is optional through index signature
        <StyledComponent text="test" />; // text is allowed through index signature; theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent />; // text is optional through index signature
        <StyledStyledComponent text="test" />; // text is allowed through index signature; theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function indexedAndRequiredProps() {
        const Component = (props: IndexedAndRequiredProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text is required
        <Component text="test" />; // text is required
        <Component text="test" foo="bar" />; // text is required; foo is allowed through index signature
        // <StyledComponent />; // text is required
        // <StyledComponent foo="bar"/>; // text is required; foo is indexed; theme is optional
        <StyledComponent text="test" />; // text is required; theme is optional
        <StyledComponent text="test" foo="bar" />; // text is required; foo is indexed; theme is optional
        <StyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <StyledComponent text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
        // <StyledStyledComponent />; // text is required
        // <StyledStyledComponent foo="bar"/>; // text is required; foo is indexed; theme is optional
        <StyledStyledComponent text="test" />; // text is required; theme is optional
        <StyledStyledComponent text="test" foo="bar" />; // text is required; foo is indexed; theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <StyledStyledComponent text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
    }

    function indexedPropsWithRequiredTheme() {
        const Component = (props: ThemedIndexedProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;


        // <Component />; // theme is required
        <Component theme={theme} />; // theme is required
        <Component foo="bar" theme={theme} />; // theme is required; foo is indexed prop
        <StyledComponent />; // theme is optional
        <StyledComponent foo="bar" />; // theme is optional; foo is indexed prop
        <StyledComponent foo="bar" theme={theme} />; // theme is allowed; foo is indexed prop
        <StyledStyledComponent />; // theme is optional
        <StyledStyledComponent foo="bar" />; // theme is optional; foo is indexed prop
        <StyledStyledComponent foo="bar" theme={theme} />; // theme is allowed; foo is indexed prop
    }

    function indexedAndRequiredPropsWithRequiredTheme() {
        const Component = (props: ThemedIndexedAndRequiredProps) => <div>{props.text}</div>;

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text and theme are required
        // <Component text="test" />; // theme is required
        // <Component text="test" foo="bar" />; theme is required
        <Component text="foo" theme={theme} />; // text is required; theme is required
        <Component text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is required
        // <StyledComponent />; // text is required; theme is optional
        // <StyledComponent foo="bar"/>; // text is required; theme is optional
        <StyledComponent text="test" />; // text is required; theme is optional
        <StyledComponent text="test" foo="bar" />; // text is required; theme is optional; foo is indexed
        <StyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <Component text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
        // <StyledStyledComponent />; // text is required; theme is optional
        // <StyledStyledComponent foo="bar"/>; // text is required; theme is optional
        <StyledStyledComponent text="test" />; // text is indexed; theme is optional
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

    function indexedProps() {
        class Component extends React.PureComponent<IndexedProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component />; // text is optional through index signature
        <Component text="test" />; // text is allowed through index signature
        <StyledComponent />; // text is optional through index signature
        <StyledComponent text="test" />; // text is allowed through index signature; theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent />; // text is optional through index signature
        <StyledStyledComponent text="test" />; // text is allowed through index signature; theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function indexedAndRequiredProps() {
        class Component extends React.PureComponent<IndexedAndRequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text is required
        <Component text="test" />; // text is required
        <Component text="test" foo="bar" />; // text is required; foo is allowed through index signature
        // <StyledComponent />; // text is required
        // <StyledComponent foo="bar"/>; // text is required; foo is indexed; theme is optional
        <StyledComponent text="test" />; // text is required; theme is optional
        <StyledComponent text="test" foo="bar" />; // text is required; foo is indexed; theme is optional
        <StyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <StyledComponent text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
        // <StyledStyledComponent />; // text is required
        // <StyledStyledComponent foo="bar"/>; // text is required; foo is indexed; theme is optional
        <StyledStyledComponent text="test" />; // text is required; theme is optional
        <StyledStyledComponent text="test" foo="bar" />; // text is required; foo is indexed; theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <StyledStyledComponent text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
    }

    function indexedPropsWithRequiredTheme() {
        class Component extends React.PureComponent<ThemedIndexedProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;


        // <Component />; // theme is required
        <Component theme={theme} />; // theme is required
        <Component foo="bar" theme={theme} />; // theme is required; foo is indexed prop
        <StyledComponent />; // theme is optional
        <StyledComponent foo="bar" />; // theme is optional; foo is indexed prop
        <StyledComponent foo="bar" theme={theme} />; // theme is allowed; foo is indexed prop
        <StyledStyledComponent />; // theme is optional
        <StyledStyledComponent foo="bar" />; // theme is optional; foo is indexed prop
        <StyledStyledComponent foo="bar" theme={theme} />; // theme is allowed; foo is indexed prop
    }

    function indexedAndRequiredPropsWithRequiredTheme() {
        class Component extends React.PureComponent<ThemedIndexedAndRequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text and theme are required
        // <Component text="test" />; // theme is required
        // <Component text="test" foo="bar" />; theme is required
        <Component text="foo" theme={theme} />; // text is required; theme is required
        <Component text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is required
        // <StyledComponent />; // text is required; theme is optional
        // <StyledComponent foo="bar"/>; // text is required; theme is optional
        <StyledComponent text="test" />; // text is required; theme is optional
        <StyledComponent text="test" foo="bar" />; // text is required; theme is optional; foo is indexed
        <StyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <Component text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
        // <StyledStyledComponent />; // text is required; theme is optional
        // <StyledStyledComponent foo="bar"/>; // text is required; theme is optional
        <StyledStyledComponent text="test" />; // text is indexed; theme is optional
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

    function indexedProps() {
        class Component extends React.Component<IndexedProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        <Component />; // text is optional through index signature
        <Component text="test" />; // text is allowed through index signature
        <StyledComponent />; // text is optional through index signature
        <StyledComponent text="test" />; // text is allowed through index signature; theme is optional
        <StyledComponent text="test" theme={theme} />; // theme is allowed
        <StyledStyledComponent />; // text is optional through index signature
        <StyledStyledComponent text="test" />; // text is allowed through index signature; theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }

    function indexedAndRequiredProps() {
        class Component extends React.Component<IndexedAndRequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text is required
        <Component text="test" />; // text is required
        <Component text="test" foo="bar" />; // text is required; foo is allowed through index signature
        // <StyledComponent />; // text is required
        // <StyledComponent foo="bar"/>; // text is required; foo is indexed; theme is optional
        <StyledComponent text="test" />; // text is required; theme is optional
        <StyledComponent text="test" foo="bar" />; // text is required; foo is indexed; theme is optional
        <StyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <StyledComponent text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
        // <StyledStyledComponent />; // text is required
        // <StyledStyledComponent foo="bar"/>; // text is required; foo is indexed; theme is optional
        <StyledStyledComponent text="test" />; // text is required; theme is optional
        <StyledStyledComponent text="test" foo="bar" />; // text is required; foo is indexed; theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <StyledStyledComponent text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
    }

    function indexedPropsWithRequiredTheme() {
        class Component extends React.Component<ThemedIndexedProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;


        // <Component />; // theme is required
        <Component theme={theme} />; // theme is required
        <Component foo="bar" theme={theme} />; // theme is required; foo is indexed prop
        <StyledComponent />; // theme is optional
        <StyledComponent foo="bar" />; // theme is optional; foo is indexed prop
        <StyledComponent foo="bar" theme={theme} />; // theme is allowed; foo is indexed prop
        <StyledStyledComponent />; // theme is optional
        <StyledStyledComponent foo="bar" />; // theme is optional; foo is indexed prop
        <StyledStyledComponent foo="bar" theme={theme} />; // theme is allowed; foo is indexed prop
    }

    function indexedAndRequiredPropsWithRequiredTheme() {
        class Component extends React.Component<ThemedIndexedAndRequiredProps> {
            render() { return <div>{this.props.text}</div>; }
        }

        const StyledComponent = styled(Component)``;
        const StyledStyledComponent = styled(StyledComponent)``;

        // <Component />; // text and theme are required
        // <Component text="test" />; // theme is required
        // <Component text="test" foo="bar" />; theme is required
        <Component text="foo" theme={theme} />; // text is required; theme is required
        <Component text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is required
        // <StyledComponent />; // text is required; theme is optional
        // <StyledComponent foo="bar"/>; // text is required; theme is optional
        <StyledComponent text="test" />; // text is required; theme is optional
        <StyledComponent text="test" foo="bar" />; // text is required; theme is optional; foo is indexed
        <StyledComponent text="test" theme={theme} />; // text is required; theme is allowed
        <Component text="test" foo="bar" theme={theme} />; // text is required; foo is indexed; theme is allowed
        // <StyledStyledComponent />; // text is required; theme is optional
        // <StyledStyledComponent foo="bar"/>; // text is required; theme is optional
        <StyledStyledComponent text="test" />; // text is indexed; theme is optional
        <StyledStyledComponent text="test" theme={theme} />; // theme is allowed
    }
}
