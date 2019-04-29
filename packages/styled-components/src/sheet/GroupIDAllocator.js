// @flow

const groupIDRegister = new Map<string, number>();
const reverseRegister = new Map<number, string>();

let nextFreeGroup = 0;

export const getGroupForID = (id: string): number => {
  if (groupIDRegister.has(id)) {
    return (groupIDRegister.get(id): any);
  }

  const group = nextFreeGroup++;
  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
  return group;
};

export const getIDForGroup = (group: number): void | string => {
  return reverseRegister.get(group);
};

export const setGroupForID = (id: string, group: number) => {
  if (group >= nextFreeGroup) {
    nextFreeGroup = group + 1;
  }

  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
};
