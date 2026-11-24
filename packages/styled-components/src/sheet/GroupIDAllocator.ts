import styledError from '../utils/error';

const MAX_SMI = 1 << 30;

let groupIDRegister: Map<string, number> = new Map();
let reverseRegister: Map<number, string> = new Map();
let baseRegister: Map<number, number> = new Map();
const extensionsRegister = new Map<number, Set<number>>();
/** Development only; survives `resetGroupIds`, since a label belongs to a component definition. */
let labelRegister: Map<string, string> | undefined;
let nextFreeGroup = 1;
let registerVersion = 0;

export const resetGroupIds = () => {
  groupIDRegister = new Map();
  reverseRegister = new Map();
  baseRegister = new Map();
  extensionsRegister.clear();
  nextFreeGroup = 1;
  // Monotonic across resets, so a version stamped before a reset never matches again.
  registerVersion++;
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
  registerVersion++;
  return group;
};

export const idForGroup = (group: number): void | string => {
  return reverseRegister.get(group);
};

/** Records the name a component's author gave it, for development warnings that name it. */
export const registerLabel = (id: string, label: string): void => {
  (labelRegister ??= new Map()).set(id, label);
};

/** The name the author gave the component of `group`, when one was recorded. */
export const labelForGroup = (group: number): string | undefined => {
  const id = reverseRegister.get(group);

  return id === undefined ? undefined : labelRegister?.get(id);
};

/** The group of an id already registered, without allocating one. */
export const lookupGroup = (id: string): number | undefined => groupIDRegister.get(id);

/** Bumps once for each id the register learns, so a cache of register hits can tell it went stale. */
export const getRegisterVersion = (): number => registerVersion;

/**
 * Map a server marker's group number to this register's number for `id`: the id's own number, else
 * the marker's number when free, else a fresh one. The allocation pointer never moves, since
 * `groupForId` skips taken numbers.
 */
export const adoptGroupForId = (id: string, group: number): number => {
  const existing = groupIDRegister.get(id);
  if (existing !== undefined) return existing;
  if (reverseRegister.has(group)) return groupForId(id);

  groupIDRegister.set(id, group);
  reverseRegister.set(group, id);
  registerVersion++;
  return group;
};

/** Record that `id`'s group extends `baseId`'s, so the sheet orders the pair before any other edge touches `id`. */
export const registerBase = (id: string, baseId: string): void => {
  const group = groupForId(id);
  const baseGroup = groupForId(baseId);
  if (group === baseGroup) return;
  const oldBase = baseRegister.get(group);
  if (oldBase === baseGroup) return;

  if (oldBase !== undefined) {
    const oldExts = extensionsRegister.get(oldBase);
    if (oldExts !== undefined) {
      oldExts.delete(group);
      if (oldExts.size === 0) extensionsRegister.delete(oldBase);
    }
  }

  baseRegister.set(group, baseGroup);

  let exts = extensionsRegister.get(baseGroup);
  if (exts === undefined) {
    exts = new Set();
    extensionsRegister.set(baseGroup, exts);
  }
  exts.add(group);
};

/** The group a chain level extends, when one was recorded. */
export const baseGroupOf = (group: number): number | undefined => baseRegister.get(group);

/** The groups registered as extending `baseGroup`, when any were recorded. */
export const extGroupsOf = (baseGroup: number): ReadonlySet<number> | undefined =>
  extensionsRegister.get(baseGroup);

/** True when any chain extension has been registered. */
export const hasExtensions = (): boolean => extensionsRegister.size > 0;
