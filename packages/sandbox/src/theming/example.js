import React from 'react';
import styled, { css, realmed, keyframes, createGlobalStyle } from 'styled-components';

const testRealm = { name: 'testeroni', default: false };

const Base = styled.div`

  display: block;
  width: 500px;
  height: 200px;
  background-color: black;

`;

realmed(Base, testRealm)`

  display: block;
  width: 500px;
  height: 200px;
  background-color: white;

`;

export const Example = () => {


  return <Base>
    Test
  </Base>
};
