import Keyframes from '../models/Keyframes';
import { Interpolation, Styles } from '../types';
export default function keyframes<Props extends object = object>(strings: Styles<Props>, ...interpolations: Array<Interpolation<Props>>): Keyframes;
