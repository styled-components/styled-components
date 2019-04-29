// @flow

const groupIDRegister = new Map<string, number>();
let nextFreeGroup = 0;

export const getGroupForID = (id: string): number => {
  if (groupIDRegister.has(id)) {
    return groupIDRegister.get(id);
  }

  const group = nextFreeGroupID++;
  groupIDRegister.set(id, group);
  return group;
};

export const setGroupForID = (id: string, group: number) => {
  if (group >= nextFreeGroup) {
    nextFreeGroup = group + 1;
  }

  groupIDRegister.set(id, group);
};
