import StyleSheet from '../sheet';
import { Dict, ExecutionContext, Interpolation, RuleSet, Stringifier } from '../types';
export declare const objToCssArray: (obj: Dict<any>, prevKey?: string) => string[];
export default function flatten<Props extends object>(chunk: Interpolation<Props>, executionContext?: ExecutionContext & Props, styleSheet?: StyleSheet, stylisInstance?: Stringifier): RuleSet<Props>;
