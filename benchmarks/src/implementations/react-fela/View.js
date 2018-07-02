/* eslint-disable react/prop-types */
import { createComponent } from 'react-fela';

const View = createComponent(
  () => ({
    alignItems: 'stretch',
    borderWidth: '0px',
    borderStyle: 'solid',
    boxSizing: 'border-box',
    display: 'flex',
    flexBasis: 'auto',
    flexDirection: 'column',
    flexShrink: '0',
    margin: '0px',
    padding: '0px',
    position: 'relative',
    // fix flexbox bugs
    minHeight: '0px',
    minWidth: '0px'
  }),
  'div'
);

export default View;
