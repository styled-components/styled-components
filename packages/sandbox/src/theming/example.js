import React from 'react';
import styled from 'styled-components';
import {realmA, realmB} from "./realms";

const Base = styled.div`

  display: block;
  width: 50px;
  height: 20px;
  background-color: black;

`;

styled(Base, realmA)`

  display: block;
  width: 50px;
  height: 20px;
  background-color: white;

`;

styled(Base, realmB)`

  display: block;
  width: 50px;
  height: 20px;
  background-color: red;

`;

export const Example = () => {


  return <Base>
    Test
  </Base>
};
