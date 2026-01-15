const MAX_SMI = 1 << 30;

let groupIDRegister: Map<string, number> = new Map();
let nextFreeGroup = 1;

export const resetGroupIds = () => {
  groupIDRegister = new Map();
  nextFreeGroup = 1;
};

export const getGroupForId = (id: string): number => {
  let group = groupIDRegister.get(id);
  if (group === undefined) {
    group = nextFreeGroup++;
    groupIDRegister.set(id, group);
  }
  return group;
};

export const getRegisteredIds = (): IterableIterator<string> => {
  return groupIDRegister.keys();
};
