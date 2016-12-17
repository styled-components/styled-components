import styled from 'styled-components';

const Simple = styled.div`width: 100%;`;

const Interpolation = styled.div`content: "  ${ props => props.text }  ";`;

const SpecialCharacters = styled.div`content: "  ${ props => props.text }  ";color: red;`;
