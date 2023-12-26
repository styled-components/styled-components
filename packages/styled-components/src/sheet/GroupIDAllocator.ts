import styledError from '../utils/error';

const MAX_SMI = 1 << (31 - 1);

let groupIDRegister: Map<string, number> = new Map();
let reverseRegister: Map<number, string> = new Map();
let nextFreeGroup = 1;

export const resetGroupIds = () => {
  groupIDRegister = new Map();
  reverseRegister = new Map();
  nextFreeGroup = 1;
};

export const getGroupForId = (id: string): number => {
  if (groupIDRegister.has(id)) {
    return groupIDRegister.get(id) as any;
  }

  while (reverseRegister.has(nextFreeGroup)) {
    nextFreeGroup++;
  }

  const group = nextFreeGroup++;

  if (process.env.NODE_ENV !== 'production' && ((group | 0) < 0 || group > MAX_SMI)) {
    throw styledError(16, `${group}`);
  }

  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
  return group;
};

export const getIdForGroup = (group: number): void | string => {
  return reverseRegister.get(group);
};

export const setGroupForId = (id: string, group: number) => {
  // move pointer
  nextFreeGroup = group + 1;

  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
};
