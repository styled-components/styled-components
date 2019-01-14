import React, { Fragment } from 'react';
import { createElement, StyleSheet, Text } from 'react-native';

const styles = StyleSheet.create({
  root: {
    display: 'inline-block',
    fill: 'currentcolor',
    height: '1.25em',
    maxWidth: '100%',
    position: 'relative',
    userSelect: 'none',
    textAlignVertical: 'text-bottom'
  }
});

const createIcon = children => {
  const Icon = props =>
    createElement(
      'svg',
      {
        style: StyleSheet.compose(styles.root, props.style),
        width: 24,
        height: 24,
        viewBox: '0 0 24 24'
      },
      children
    );
  Icon.propTypes = {
    style: Text.propTypes.style
  };
  return Icon;
};

export const IconClear = createIcon(
  <Fragment>
    <path d="M0 0h24v24H0z" id="bounds" opacity="0" />
    <path d="M12 1.25C6.072 1.25 1.25 6.072 1.25 12S6.072 22.75 12 22.75 22.75 17.928 22.75 12 17.928 1.25 12 1.25zm0 1.5c2.28 0 4.368.834 5.982 2.207L4.957 17.982C3.584 16.368 2.75 14.282 2.75 12c0-5.1 4.15-9.25 9.25-9.25zm0 18.5c-2.28 0-4.368-.834-5.982-2.207L19.043 6.018c1.373 1.614 2.207 3.7 2.207 5.982 0 5.1-4.15 9.25-9.25 9.25z" />
  </Fragment>
);

export const IconEye = createIcon(
  <Fragment>
    <path d="M0 0h24v24H0z" id="bounds" opacity="0" />
    <path d="M14.548 11.634c-1.207 0-2.188-.98-2.188-2.188 0-.664.302-1.25.77-1.653-.363-.097-.736-.165-1.13-.165-2.416 0-4.375 1.96-4.375 4.376S9.585 16.38 12 16.38c2.418 0 4.377-1.96 4.377-4.376 0-.4-.07-.78-.17-1.146-.402.47-.992.776-1.66.776z" />
    <path d="M12 19.79c-7.228 0-10.12-6.724-10.24-7.01-.254-.466-.254-1.105.035-1.642C1.88 10.923 4.772 4.2 12 4.2s10.12 6.723 10.24 7.01c.254.465.254 1.104-.035 1.64-.085.216-2.977 6.94-10.205 6.94zm0-14c-6.154 0-8.668 5.787-8.772 6.033-.068.135-.068.208-.033.273.137.316 2.65 6.104 8.805 6.104 6.18 0 8.747-5.973 8.772-6.033.07-.136.07-.21.034-.274-.138-.316-2.652-6.103-8.806-6.103z" />
  </Fragment>
);

export const IconCopy = createIcon(
  <Fragment>
    <path d="M0 0h24v24H0z" id="bounds" opacity="0" />
    <path d="M11.47 14.53c.146.146.338.22.53.22s.384-.073.53-.22l5-5c.293-.293.293-.768 0-1.06s-.768-.294-1.06 0l-3.72 3.72V2c0-.414-.337-.75-.75-.75s-.75.336-.75.75v10.19L7.53 8.47c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l5 5z" />
    <path d="M21.25 13.25c-.414 0-.75.336-.75.75v5.652c0 .437-.355.792-.792.792H4.292c-.437 0-.792-.355-.792-.792V14c0-.414-.336-.75-.75-.75S2 13.586 2 14v5.652c0 1.264 1.028 2.292 2.292 2.292h15.416c1.264 0 2.292-1.028 2.292-2.292V14c0-.414-.336-.75-.75-.75z" />
  </Fragment>
);
