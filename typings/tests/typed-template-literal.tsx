import styled from "../..";

const plain = styled.h1`
  color: ${props => props.className};
`;

const withTypeArgs = styled.h1<{ hello: string }>`
  color: ${props => props.hello};
`;
