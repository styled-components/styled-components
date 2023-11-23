import React from 'react';

import styled from '../constructors/styled';

export const Button = ({ size }: { size: 'small' | 'large' }) => {
  return <button className={size} />
}

export const StyledButton = styled(Button)``
