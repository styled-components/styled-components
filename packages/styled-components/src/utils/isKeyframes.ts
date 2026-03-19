import type KeyframesClass from '../models/Keyframes';

const KEYFRAMES_SYMBOL = Symbol.for('sc-keyframes');

export default function isKeyframes(value: unknown): value is KeyframesClass {
  return typeof value === 'object' && value !== null && KEYFRAMES_SYMBOL in value;
}

export { KEYFRAMES_SYMBOL };
