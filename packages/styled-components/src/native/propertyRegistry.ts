/**
 * App-global registry of custom property registrations from @property
 * rules (CSS Properties and Values API). Registration happens at style
 * compile time; var() resolution consults it for typed initial values
 * and the inherits flag. The rule's document-global scope maps to a
 * module-level map on RN (there is no per-document scoping).
 */

export interface CssPropertyRegistration {
  /** Normalized syntax string, quotes stripped (e.g. `<length>`, `*`). */
  syntax: string;
  inherits: boolean;
  /** `null` = the guaranteed-invalid value (universal syntax only). */
  initialValue: string | null;
}

const registry = new Map<string, CssPropertyRegistration>();

export function registerCssProperty(name: string, reg: CssPropertyRegistration): void {
  registry.set(name, reg);
}

export function getCssPropertyRegistration(name: string): CssPropertyRegistration | undefined {
  return registry.get(name);
}

/** Test-only: clear all registrations. */
export function resetCssPropertiesForTest(): void {
  registry.clear();
}
