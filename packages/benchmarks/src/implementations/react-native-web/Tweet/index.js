import AspectRatio from './AspectRatio';
import GridView from './GridView';
import PropTypes from 'prop-types';
import TweetActionsBar from './TweetActionsBar';
import TweetText from './TweetText';
import UserAvatar from './UserAvatar';
import UserNames from './UserNames';
import { Image, StyleSheet, Text, View } from 'react-native';
import React, { Component } from 'react';
import theme from './theme';

export class Tweet extends Component {
  static displayName = 'Tweet';

  static propTypes = {
    tweet: PropTypes.object.isRequired
  };

  render() {
    const { tweet } = this.props;
    const { id, lang, media, textParts, timestamp, user } = tweet;
    const { fullName, profileImageUrl, screenName } = user;

    return (
      <View accessibilityRole="article" accessible style={styles.root}>
        <GridView hasGap>
          <View style={styles.avatarColumn}>
            <View
              accessibilityRole="link"
              accessible
              href={`/${screenName}`}
              style={styles.avatarLink}
            >
              <UserAvatar style={styles.avatar} uri={profileImageUrl} />
            </View>
          </View>

          <View style={styles.bodyColumn}>
            <View style={styles.body}>
              <View style={styles.row}>
                <Text
                  accessibilityRole="link"
                  children={timestamp}
                  href={`/${screenName}/status/${id}`}
                  style={styles.timestamp}
                />
                <UserNames fullName={fullName} screenName={screenName} />
              </View>

              <View accessibilityRole="heading" aria-level="4">
                <TweetText displayMode={'links'} lang={lang} textParts={textParts} />
              </View>

              {media ? (
                <View style={styles.richContent}>
                  <AspectRatio ratio={16 / 9}>
                    <Image
                      resizeMode={Image.resizeMode.cover}
                      source={media.source}
                      style={styles.media}
                    />
                  </AspectRatio>
                </View>
              ) : null}
            </View>

            <TweetActionsBar
              actions={[
                { name: 'reply', label: 'Reply' },
                {
                  name: 'retweet',
                  label: 'Retweet',
                  count: tweet.retweet_count,
                  highlighted: tweet.retweeted
                },
                {
                  name: 'like',
                  label: 'Like',
                  count: tweet.favorite_count,
                  highlighted: tweet.favorited
                },
                { name: 'directMessage', label: 'Direct Message' }
              ]}
              style={styles.actionBar}
            />
          </View>
        </GridView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: theme.createLength(theme.spaceY * 0.75, 'rem'),
    paddingHorizontal: theme.createLength(theme.spaceX, 'rem')
  },
  avatarColumn: {
    flexGrow: 1,
    minWidth: 32
  },
  bodyColumn: {
    flexGrow: 7
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  avatarLink: {
    display: 'block',
    flexShrink: 1,
    flexGrow: 0,
    width: '100%'
  },
  avatar: {
    width: '100%'
  },
  body: {
    marginTop: '-0.15rem'
  },
  timestamp: {
    color: theme.colors.deepGray,
    marginLeft: theme.createLength(theme.spaceX, 'rem'),
    order: 1,
    textDecorationLine: 'none',
    whiteSpace: 'nowrap'
  },
  actionBar: {
    marginTop: theme.createLength(theme.spaceY * 0.5, 'rem')
  },
  richContent: {
    borderRadius: '0.35rem',
    marginTop: theme.createLength(theme.spaceY * 0.5, 'rem'),
    overflow: 'hidden'
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    margin: 'auto',
    width: 'auto',
    height: 'auto'
  }
});

export default Tweet;
