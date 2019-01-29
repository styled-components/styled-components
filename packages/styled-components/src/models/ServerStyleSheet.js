// @flow
/* eslint-disable no-underscore-dangle */

import React from 'react';
import stream from 'stream';
import { Sheet } from 'styled-sheet';

import { IS_BROWSER } from '../constants';
import StyledError from '../utils/error';
import StyleSheetManager from './StyleSheetManager';

declare var __SERVER__: boolean;

export default class ServerStyleSheet {
  sheet: Sheet;

  sealed: boolean;

  constructor() {
    this.sheet = new Sheet(undefined, true);
    this.sealed = false;
  }

  collectStyles(children: any) {
    if (this.sealed) {
      throw new StyledError(2);
    }

    return <StyleSheetManager sheet={this.sheet}>{children}</StyleSheetManager>;
  }

  getStyleTags(): string {
    return this.sheet.toHTML();
  }

  interleaveWithNodeStream(readableStream: stream.Readable) {
    if (!__SERVER__ || IS_BROWSER) {
      throw new StyledError(3);
    }

    this.sealed = true;
    const { sheet } = this;

    const transformer = new stream.Transform({
      transform: function appendStyleChunks(chunk, /* encoding */ _, callback) {
        const html = sheet.toHTML();
        // Force Sheet to "forget" about previously emitted CSS
        sheet.reset();
        this.push(html + chunk);
        callback();
      },
    });

    readableStream.on('error', err => {
      transformer.emit('error', err);
    });

    return readableStream.pipe(transformer);
  }
}
