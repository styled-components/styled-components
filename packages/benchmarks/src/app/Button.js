import React, { Component } from 'react';
import { StyleSheet, Text, TouchableHighlight } from 'react-native';

export default class Button extends Component {
  static displayName = '@app/Button';

  render() {
    const {
      accessibilityLabel,
      color,
      disabled,
      onPress,
      style,
      textStyle,
      testID,
      title,
    } = this.props;

    return (
      <TouchableHighlight
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.button,
          style,
          color && { backgroundColor: color },
          disabled && styles.buttonDisabled,
        ]}
        testID={testID}
      >
        <Text style={[styles.text, textStyle, disabled && styles.textDisabled]}>{title}</Text>
      </TouchableHighlight>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 0,
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    padding: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  buttonDisabled: {
    backgroundColor: '#dfdfdf',
  },
  textDisabled: {
    color: '#a1a1a1',
  },
});
