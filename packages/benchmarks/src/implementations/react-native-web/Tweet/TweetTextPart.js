/* eslint-disable react/prop-types */
import { Image, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';
import React from 'react';
import theme from './theme';

const createTextEntity = ({ part }) => <Text>{`${part.prefix}${part.text}`}</Text>;

const createTwemojiEntity = ({ part }) => (
  <Image
    accessibilityLabel={part.text}
    draggable={false}
    source={{ uri: part.emoji }}
    style={styles.twemoji}
  />
);

// @mention, #hashtag, $cashtag
const createSymbolEntity = ({ displayMode, part }) => {
  const links = displayMode === 'links';
  return (
    <Text accessibilityRole={links ? 'link' : null} href={part.url} style={[links && styles.link]}>
      {`${part.prefix}${part.text}`}
    </Text>
  );
};

// internal links
const createLinkEntity = ({ displayMode, part }) => {
  const { displayUrl, linkRelation, url } = part;
  const links = displayMode === 'links';

  return (
    <Text
      accessibilityRole={links ? 'link' : null}
      href={url}
      rel={links ? linkRelation : null}
      style={[links && styles.link]}
    >
      {displayUrl}
    </Text>
  );
};

// external links
const createExternalLinkEntity = ({ displayMode, part }) => {
  const { displayUrl, linkRelation, url } = part;
  const links = displayMode === 'links';

  return (
    <Text
      accessibilityRole={links ? 'link' : null}
      href={url}
      rel={links ? linkRelation : null}
      style={[links && styles.link]}
      target="_blank"
    >
      {displayUrl}
    </Text>
  );
};

class TweetTextPart extends React.Component {
  static displayName = 'TweetTextPart';

  static propTypes = {
    displayMode: PropTypes.oneOf(['links', 'no-links']),
    part: PropTypes.object
  };

  static defaultProps = {
    displayMode: 'links'
  };

  render() {
    let renderer;
    const { isEmoji, isEntity, isHashtag, isMention, isMedia, isUrl } = this.props.part;

    if (isEmoji || isEntity || isUrl || isMedia) {
      if (isUrl) {
        renderer = createExternalLinkEntity;
      } else if (isHashtag || isMention) {
        renderer = createSymbolEntity;
      } else if (isEmoji) {
        renderer = createTwemojiEntity;
      } else {
        renderer = createLinkEntity;
      }
    } else {
      renderer = createTextEntity;
    }

    return renderer(this.props);
  }
}

const styles = StyleSheet.create({
  link: {
    color: theme.colors.blue,
    textDecorationLine: 'none',
    unicodeBidi: 'embed'
  },
  twemoji: {
    display: 'inline-block',
    height: '1.25em',
    width: '1.25em',
    paddingRight: '0.05em',
    paddingLeft: '0.1em',
    textAlignVertical: '-0.2em'
  }
});

export default TweetTextPart;
