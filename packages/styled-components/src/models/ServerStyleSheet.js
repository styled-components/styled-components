// @flow
/* eslint-disable no-underscore-dangle */
import React from 'react';
import stream, { type Readable } from 'stream';

import { IS_BROWSER, SC_STREAM_ATTR } from '../constants';
import StyledError from '../utils/error';
import StyleSheet from './StyleSheet';
import StyleSheetManager from './StyleSheetManager';

declare var __SERVER__: boolean;

const CLOSING_TAG_R = /^\s*<\/[a-z]/i;

export default class ServerStyleSheet {
  instance: StyleSheet;

  masterSheet: StyleSheet;

  sealed: boolean;

  constructor() {
    /* The master sheet might be reset, so keep a reference here */
    this.masterSheet = StyleSheet.master;
    this.instance = this.masterSheet.clone();
    this.sealed = false;
  }

  /**
   * Mark the ServerStyleSheet as being fully emitted and manually GC it from the
   * StyleSheet singleton.
   */
  seal() {
    if (!this.sealed) {
      /* Remove sealed StyleSheets from the master sheet */
      const index = this.masterSheet.clones.indexOf(this.instance);
      this.masterSheet.clones.splice(index, 1);
      this.sealed = true;
    }
  }

  collectStyles(children: any) {
    if (this.sealed) {
      throw new StyledError(2);
    }

    return <StyleSheetManager sheet={this.instance}>{children}</StyleSheetManager>;
  }

  getStyleTags(): string {
    this.seal();
    return this.instance.toHTML();
  }

  getStyleElement() {
    this.seal();
    return this.instance.toReactElements();
  }

  interleaveWithNodeStream(readableStream: Readable) {
    if (!__SERVER__ || IS_BROWSER) {
      throw new StyledError(3);
    }

    /* the tag index keeps track of which tags have already been emitted */
    const { instance } = this;
    let instanceTagIndex = 0;

    const streamAttr = `${SC_STREAM_ATTR}="true"`;

    const transformer = new stream.Transform({
      transform: function appendStyleChunks(chunk, /* encoding */ _, callback) {
        const { tags } = instance;
        let html = '';

        /* retrieve html for each new style tag */
        for (; instanceTagIndex < tags.length; instanceTagIndex += 1) {
          const tag = tags[instanceTagIndex];
          html += tag.toHTML(streamAttr);
        }

        /* force our StyleSheets to emit entirely new tags */
        instance.sealAllTags();

        const renderedHtml = chunk.toString();

        /* prepend style html to chunk, unless the start of the chunk is a closing tag in which case append right after that */
        if (CLOSING_TAG_R.test(renderedHtml)) {
          const endOfClosingTag = renderedHtml.indexOf('>');

          this.push(
            renderedHtml.slice(0, endOfClosingTag + 1) +
              html +
              renderedHtml.slice(endOfClosingTag + 1)
          );
        } else this.push(html + renderedHtml);

        callback();
      },
    });

    readableStream.on('end', () => this.seal());

    readableStream.on('error', err => {
      this.seal();

      // forward the error to the transform stream
      transformer.emit('error', err);
    });

    return readableStream.pipe(transformer);
  }
}
