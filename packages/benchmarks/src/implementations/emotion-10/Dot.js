import styled from '@emotion/styled';

export default styled.div(p => ({
  position: 'absolute',
  cursor: 'pointer',
  width: 0,
  height: 0,
  borderColor: 'transparent',
  borderStyle: 'solid',
  borderTopWidth: 0,
  transform: 'translate(50%, 50%)',
  borderBottomColor: p.color,
  borderRightWidth: `${p.size / 2}px`,
  borderBottomWidth: `${p.size / 2}px`,
  borderLeftWidth: `${p.size / 2}px`,
  marginLeft: `${p.x}px`,
  marginTop: `${p.y}px`,
}));
