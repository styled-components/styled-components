import React from 'react';
import styled from 'styled-components';
import {realmA, realmB} from "./realms";

const Base = styled.div`

  display: block;
  width: 50px;
  height: 20px;

`;

styled(Base, realmA)`

  background-color: white;

`;

styled(Base, realmB)`

  background-color: red;

`;

export const Example = () => {


  return <Base>
    Test
  </Base>
};
