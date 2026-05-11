import vanilla from './implementations/vanilla-stylesheet';
import v7 from './implementations/styled-components-native';
import v6 from './implementations/styled-components-native-v6';
import type { BenchComponents } from './cases/types';

export interface Implementation {
  name: string;
  components: BenchComponents;
}

// vanilla-stylesheet is the baseline — raw RN <View> + StyleSheet.create. It's
// the floor SC layers on top of, so the v7/v6 deltas vs vanilla show the
// styled-components tax in absolute terms.
const implementations: Implementation[] = [
  { name: 'vanilla-stylesheet', components: vanilla },
  { name: 'styled-components-native', components: v7 },
  { name: 'styled-components-native-v6', components: v6 },
];

export default implementations;
