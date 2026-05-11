import styledError from '../utils/error';

const MAX_SMI = 1 << 30;

let groupIDRegister: Map<string, number> = new Map();
let reverseRegister: Map<number, string> = new Map();
let nextFreeGroup = 1;

export const resetGroupIds = () => {
  groupIDRegister = new Map();
  reverseRegister = new Map();
  nextFreeGroup = 1;
};

export const groupForId = (id: string): number => {
  const existing = groupIDRegister.get(id);
  if (existing !== undefined) return existing;

  while (reverseRegister.has(nextFreeGroup)) {
    nextFreeGroup++;
  }

  const group = nextFreeGroup++;

  if (__DEV__ && ((group | 0) < 0 || group > MAX_SMI)) {
    throw styledError(16, `${group}`);
  }

  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
  return group;
};

export const idForGroup = (group: number): void | string => {
  return reverseRegister.get(group);
};

export const setGroupForId = (id: string, group: number) => {
  // move pointer
  nextFreeGroup = group + 1;

  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
};
