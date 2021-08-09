// @flow
/* eslint-disable no-underscore-dangle */
import React from 'react';
import { IS_BROWSER, SC_ATTR, SC_ATTR_VERSION, SC_VERSION } from '../constants';
import throwStyledError from '../utils/error';
import getNonce from '../utils/nonce';
import StyleSheet from '../sheet';
import StyleSheetManager from './StyleSheetManager';

declare var __SERVER__: boolean;

const CLOSING_TAG_R = /^\s*<\/[a-z]/i;

export default class ServerStyleSheet {
  isStreaming: boolean;

  instance: StyleSheet;

  sealed: boolean;

  constructor() {
    this.instance = new StyleSheet({ isServer: true });
    this.sealed = false;
  }

  _emitSheetCSS = (): string => {
    const css = this.instance.toString();
    if (!css) return '';

    const nonce = getNonce();
    const attrs = [nonce && `nonce="${nonce}"`, `${SC_ATTR}="true"`, `${SC_ATTR_VERSION}="${SC_VERSION}"`];
    const htmlAttr = attrs.filter(Boolean).join(' ');

    return `<style ${htmlAttr}>${css}</style>`;
  };

  collectStyles(children: any) {
    if (this.sealed) {
      return throwStyledError(2);
    }

    return <StyleSheetManager sheet={this.instance}>{children}</StyleSheetManager>;
  }

  getStyleTags = (): string => {
    if (this.sealed) {
      return throwStyledError(2);
    }

    return this._emitSheetCSS();
  };

  getStyleElement = () => {
    if (this.sealed) {
      return throwStyledError(2);
    }

    const props = {
      [SC_ATTR]: '',
      [SC_ATTR_VERSION]: SC_VERSION,
      dangerouslySetInnerHTML: {
        __html: this.instance.toString(),
      },
    };

    const nonce = getNonce();
    if (nonce) {
      (props: any).nonce = nonce;
    }

    // v4 returned an array for this fn, so we'll do the same for v5 for backward compat
    return [<style {...props} key="sc-0-0" />];
  };

  // eslint-disable-next-line consistent-return
  interleaveWithNodeStream(input: any) {
    if (!__SERVER__ || IS_BROWSER) {
      return throwStyledError(3);
    } else if (this.sealed) {
      return throwStyledError(2);
    }

    if (__SERVER__) {
      this.seal();

      // eslint-disable-next-line global-require
      const { Readable, Transform } = require('stream');

      const readableStream: Readable = input;
      const { instance: sheet, _emitSheetCSS } = this;

      const transformer = new Transform({
        transform: function appendStyleChunks(chunk, /* encoding */ _, callback) {
          // Get the chunk and retrieve the sheet's CSS as an HTML chunk,
          // then reset its rules so we get only new ones for the next chunk
          const renderedHtml = chunk.toString();
          const html = _emitSheetCSS();

          sheet.clearTag();

          // prepend style html to chunk, unless the start of the chunk is a
          // closing tag in which case append right after that
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

      readableStream.on('error', err => {
        // forward the error to the transform stream
        transformer.emit('error', err);
      });

      return readableStream.pipe(transformer);
    }
  }

  seal = () => {
    this.sealed = true;
  };
}
