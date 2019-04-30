// @flow
/* eslint-disable no-underscore-dangle */

import React from 'react';

import {
  IS_BROWSER,
  SC_STREAM_ATTR,
  SC_ATTR,
  SC_VERSION_ATTR,
  SC_VERSION
} from '../constants';

import StyledError from '../utils/error';
import getNonce from '../utils/nonce';
import StyleSheet from '../sheet';
import StyleSheetManager from './StyleSheetManager';

declare var __SERVER__: boolean;

const CLOSING_TAG_R = /^\s*<\/[a-z]/i;

export default class ServerStyleSheet {
  sheet: StyleSheet;
  sealed: boolean;

  constructor() {
    this.sheet = new StyleSheet(true);
    this.sealed = false;
  }

  collectStyles(children: any) {
    if (this.sealed) {
      throw new StyledError(2);
    }

    this.sealed = true;
    return <StyleSheetManager sheet={this.sheet}>{children}</StyleSheetManager>;
  }

  getStyleTags = (): string => {
    const css = this.sheet.toString();
    const nonce = getNonce();
    const attrs = [
      nonce && `nonce="${nonce}"`,
      SC_ATTR,
      `${SC_VERSION_ATTR}="${SC_VERSION}"`
    ];

    const htmlAttr = attrs.filter(Boolean).join(' ');
    return `<style ${htmlAttr}>${css}</style>`;
  }

  getStyleElement = () => {
    const props = {
      [SC_ATTR]: '',
      [SC_VERSION_ATTR]: SC_VERSION,
      dangerouslySetInnerHTML: {
        __html: this.sheet.toString()
      }
    };

    const nonce = getNonce();
    if (nonce) {
      (props: any).nonce = nonce;
    }

    return <style {...props} />;
  }

  interleaveWithNodeStream(input: any) {
    if (!__SERVER__ || IS_BROWSER) {
      throw new StyledError(3);
    }

    const { Readable, Transform } = require('stream');
    const readableStream: Readable = input;
    const { sheet, getStyleTags } = this;

    const transformer = new Transform({
      transform: function appendStyleChunks(chunk, /* encoding */ _, callback) {
        // Get the chunk and retrieve the sheet's CSS as an HTML chunk,
        // then reset its rules so we get only new ones for the next chunk
        const renderedHtml = chunk.toString();
        const html = getStyleTags();
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
