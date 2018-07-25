import AppText from './AppText';
import React from 'react';
import TweetTextPart from './TweetTextPart';
import { array, number, string } from 'prop-types';

class TweetText extends React.Component {
  static displayName = 'TweetText';

  static propTypes = {
    displayMode: TweetTextPart.propTypes.displayMode,
    lang: string,
    numberOfLines: number,
    textParts: array.isRequired
  };

  render() {
    const { displayMode, lang, numberOfLines, textParts, ...other } = this.props;

    return (
      <AppText {...other} lang={lang} numberOfLines={numberOfLines}>
        {textParts.map((part, i) => (
          <TweetTextPart displayMode={displayMode} key={i} part={part} />
        ))}
      </AppText>
    );
  }
}

export default TweetText;
