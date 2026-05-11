import styled from 'styled-components/native';

// Fully static CSS — no function interpolations, no $-prop reads. With
// styled-components v7 this hits the lite render path. Padding (no fixed
// dimensions) lets container nodes auto-size to their nested children, so a
// deep tree renders as visibly-stacked boxes rather than collapsing to a
// single 8×8 outer.
const BoxStatic = styled.View`
  align-self: flex-start;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 2px;
  background-color: #ffad1f;
  border-radius: 2px;
`;

export default BoxStatic;
