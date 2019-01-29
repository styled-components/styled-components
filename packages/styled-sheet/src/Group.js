// @flow

import type { UniqueGroup } from './types';

type GroupNameMap = { [name: string]: Group };

// This will always keep track of the first available
// group index that a group can use and increments
// whenever a new one is created
let MAX_GROUP_INDEX = 1;

// $FlowFixMe
const rehydratedGroups: GroupNameMap = Object.create(null);

class Group implements UniqueGroup {
  name: string;
  index: number;

  // Rehydrates a group by precreating it with a specific group index
  static rehydrate(name: string, group: number) {
    if (group >= MAX_GROUP_INDEX) {
      MAX_GROUP_INDEX = group + 1;
    }

    return (rehydratedGroups[name] = new Group(name));
  }

  constructor(name: string) {
    // Use a rehydrated group if it exists
    const prevGroup = rehydratedGroups[name];
    if (prevGroup !== undefined) {
      return prevGroup;
    } else {
      this.name = name;
      this.index = MAX_GROUP_INDEX++;
      return this;
    }
  }
}

export default Group;
