/// <reference types="node" />
import type * as streamInternal from 'stream';
import { Readable } from 'stream';
import StyleSheet from '../sheet';
export default class ServerStyleSheet {
    instance: StyleSheet;
    sealed: boolean;
    constructor();
    _emitSheetCSS: () => string;
    collectStyles(children: any): JSX.Element;
    getStyleTags: () => string;
    getStyleElement: () => JSX.Element[];
    interleaveWithNodeStream(input: Readable): streamInternal.Transform;
    seal: () => void;
}
