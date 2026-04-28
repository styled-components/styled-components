import React from 'react';
import { type PipeableStream } from 'react-dom/server';
import { SC_ATTR, SC_ATTR_VERSION, SC_VERSION } from '../constants';
import StyleSheet from '../sheet';
import styledError from '../utils/error';

declare const __SERVER__: boolean;
import { joinStringArray } from '../utils/joinStrings';
import getNonce from '../utils/nonce';
import { StyleSheetManager } from './StyleSheetManager';

const CLOSING_TAG_R = /*#__PURE__*/ /^\s*<\/[a-z]/i;

export default class ServerStyleSheet {
  instance: StyleSheet;
  sealed: boolean;

  constructor({ nonce }: { nonce?: string } = {}) {
    this.instance = new StyleSheet({ isServer: true, nonce });
    this.sealed = false;
  }

  _emitSheetCSS = (): string => {
    const css = this.instance.toString();
    if (!css) return '';
    const nonce = this.instance.options.nonce || getNonce();
    const attrs = [
      nonce && `nonce="${nonce}"`,
      `${SC_ATTR}="true"`,
      `${SC_ATTR_VERSION}="${SC_VERSION}"`,
    ];
    const htmlAttr = joinStringArray(attrs.filter(Boolean) as string[], ' ');

    return `<style ${htmlAttr}>${css}</style>`;
  };

  collectStyles(children: any): React.JSX.Element {
    if (this.sealed) {
      throw styledError(2);
    }

    return <StyleSheetManager sheet={this.instance}>{children}</StyleSheetManager>;
  }

  getStyleTags = (): string => {
    if (this.sealed) {
      throw styledError(2);
    }

    return this._emitSheetCSS();
  };

  getStyleElement = () => {
    if (this.sealed) {
      throw styledError(2);
    }

    const css = this.instance.toString();
    if (!css) return [];

    const nonce = this.instance.options.nonce || getNonce();
    const props: {
      [SC_ATTR]: string;
      [SC_ATTR_VERSION]: string;
      dangerouslySetInnerHTML: { __html: string };
      nonce?: string;
    } = {
      [SC_ATTR]: '',
      [SC_ATTR_VERSION]: SC_VERSION,
      dangerouslySetInnerHTML: { __html: css },
    };
    if (nonce) {
      props.nonce = nonce;
    }

    // v4 returned an array for this fn, so we'll do the same for v5 for backward compat
    return [<style {...props} key="sc-0-0" />];
  };

  interleaveWithNodeStream(input: NodeJS.ReadableStream | PipeableStream): NodeJS.ReadWriteStream {
    if (!__SERVER__) {
      throw styledError(3);
    } else if (this.sealed) {
      throw styledError(2);
    }

    this.seal();

    const { Transform } = require('stream');
    const { instance: sheet, _emitSheetCSS } = this;

    const transformer: NodeJS.ReadWriteStream = new Transform({
      transform: function appendStyleChunks(
        chunk: string,
        /* encoding */
        _: string,
        callback: Function
      ) {
        const renderedHtml = chunk.toString();
        const html = _emitSheetCSS();

        sheet.clearTag();

        if (CLOSING_TAG_R.test(renderedHtml)) {
          const endOfClosingTag = renderedHtml.indexOf('>') + 1;
          const before = renderedHtml.slice(0, endOfClosingTag);
          const after = renderedHtml.slice(endOfClosingTag);

          this.push(before + html + after);
        } else {
          this.push(html + renderedHtml);
        }

        callback();
      },
    });

    if ('on' in input && typeof input.on === 'function' && 'pipe' in input) {
      const readableStream = input as NodeJS.ReadableStream;
      readableStream.on('error', err => {
        transformer.emit('error', err);
      });
      return readableStream.pipe(transformer);
    } else if ('pipe' in input && typeof input.pipe === 'function') {
      const pipeableStream = input as PipeableStream;
      return pipeableStream.pipe(transformer);
    } else {
      throw new Error('Unsupported stream type');
    }
  }

  seal = (): void => {
    this.sealed = true;
  };
}
