// @flow

class GroupRegistry {
  nameToGroup: { [name: string]: number };

  groupToName: { [group: number]: string };

  length: number;

  constructor() {
    // $FlowFixMe
    this.nameToGroup = Object.create(null);
    // $FlowFixMe
    this.groupToName = Object.create(null);
    // This is set to 1 to reserve 0 for global rules
    this.length = 1;
  }

  forEach(fn: (string, number) => void): void {
    for (const name in this.nameToGroup) {
      const group = this.nameToGroup[name];
      fn(name, group);
    }
  }

  // This is used to register a name against a known index
  rehydrateRuleGroup(name: string, group: number) {
    this.nameToGroup[name] = group;
    this.groupToName[group] = name;
    if (group >= this.length) {
      this.length = group + 1;
    }
  }

  // Registers a name and returns a new group index
  registerRuleGroup(name: string): number {
    let group = this.nameToGroup[name];
    if (group === undefined) {
      group = this.length++;
      this.nameToGroup[name] = group;
      this.groupToName[group] = name;
    }

    return group;
  }
}

export default new GroupRegistry();
