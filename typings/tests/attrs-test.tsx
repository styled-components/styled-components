
import styled from "../..";

const Input = styled.input.attrs({
  // we can define static props
  type: "password",

  // or we can define dynamic ones
  margin: props => props.size || "1em",
  padding: props => props.size || "1em"
})`
	color: palevioletred;
	font-size: 1em;
	border: 2px solid palevioletred;
	border-radius: 3px;

	/* here we use the dynamically computed props */
	margin: ${(props) => props.margin};
	padding: ${(props)  => props.padding};
`;

const Button = styled.button`
  color: palevioletred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
`;

const TomatoButton = Button.attrs({
  title: (props) => "title"
})`
  color: red;
`;
