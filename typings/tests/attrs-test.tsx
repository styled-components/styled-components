import styled from "../..";

const Input = styled.input.attrs({
  // we can define static props
  type: "password",

  // or we can define dynamic ones
  margin: (props: any) => props.size as string || "1em",
  padding: (props: any) => props.size as string || "1em"
})`
  color: palevioletred;
  font-size: 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;

  /* here we use the dynamically computed props */
  margin: ${(props) => props.margin};
  padding: ${(props)  => props.padding};
`;
