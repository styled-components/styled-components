import unitless from './unitless';

export default function addUnitIfNeeded(name: string, value: unknown): string {
  if (value == null || typeof value === 'boolean' || value === '') {
    return '';
  }

  if (typeof value === 'number' && value !== 0 && !(name in unitless) && !name.startsWith('--')) {
    return `${value}px`;
  }

  return String(value).trim();
}
