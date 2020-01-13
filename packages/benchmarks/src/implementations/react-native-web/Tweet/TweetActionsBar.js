import PropTypes from 'prop-types';
import TweetAction from './TweetAction';
import { View, ViewPropTypes, StyleSheet } from 'react-native';
import React, { PureComponent } from 'react';

const actionNames = ['reply', 'retweet', 'like', 'directMessage'];

export default class TweetActionsBar extends PureComponent {
  static propTypes = {
    actions: PropTypes.arrayOf(
      PropTypes.shape({
        count: PropTypes.number,
        label: PropTypes.string,
        highlighted: PropTypes.bool,
        name: PropTypes.oneOf(actionNames).isRequired,
        onPress: PropTypes.func
      })
    ),
    style: ViewPropTypes.style
  };

  render() {
    const { actions, style } = this.props;

    /* eslint-disable react/jsx-handler-names */
    return (
      <View style={[styles.root, style]}>
        {actions.map((action, i) => (
          <TweetAction
            accessibilityLabel={actions.label}
            count={action.count}
            displayMode={action.name}
            highlighted={action.highlighted}
            key={i}
            onPress={action.onPress}
            style={styles.action}
          />
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row'
  },
  action: {
    display: 'block',
    marginRight: '10%'
  }
});
