import styled from '@emotion/styled';
import View from './View';

const styles = {
  outer: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  color0: {
    backgroundColor: '#14171A',
  },
  color1: {
    backgroundColor: '#AAB8C2',
  },
  color2: {
    backgroundColor: '#E6ECF0',
  },
  color3: {
    backgroundColor: '#FFAD1F',
  },
  color4: {
    backgroundColor: '#F45D22',
  },
  color5: {
    backgroundColor: '#E0245E',
  },
  fixed: {
    width: 6,
    height: 6,
  },
};

const Box = styled(View)(
  { alignSelf: 'flex-start' },
  p => styles[`color${p.color}`],
  p => (p.fixed ?? false) && styles.fixed,
  p => (p.layout ?? 'column') === 'row' && styles.row,
  p => (p.outer ?? false) && styles.outer
);

export default Box;
