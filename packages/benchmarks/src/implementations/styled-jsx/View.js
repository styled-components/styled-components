/* eslint-disable react/prop-types */
import React from 'react';

class View extends React.Component {
  render() {
    const { children, className, ...props } = this.props;
    return (
      <div {...props} className={`initial ${className}`}>
        {children}
        <style jsx>{`
          .initial {
            align-items: stretch;
            border-width: 0;
            border-style: solid;
            box-sizing: border-box;
            display: flex;
            flex-basis: auto;
            flex-direction: column;
            flex-shrink: 0;
            margin: 0;
            padding: 0;
            position: relative;
            min-height: 0;
            min-width: 0;
          }
        `}</style>
      </div>
    );
  }
}

export default View;
