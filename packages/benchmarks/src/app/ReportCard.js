import React from 'react';
import { font, monoFont } from './constants';

const fmt = time => {
  const i = Number(Math.round(time + 'e2') + 'e-2').toFixed(2);
  return 10 / i > 1 ? `0${i}` : i;
};

class ReportCard extends React.PureComponent {
  render() {
    const {
      benchmarkName,
      hideBenchmarkName,
      libraryName,
      sampleCount,
      mean,
      meanLayout,
      meanScripting,
      stdDev,
      libraryVersion,
    } = this.props;

    const sampleCountText = sampleCount != null ? ` (${sampleCount})` : '';
    const isInProgress = !mean;

    return (
      <div style={styles.root}>
        <div style={styles.left}>
          <div style={styles.libraryName}>
            {libraryName}
            {libraryVersion ? <span style={styles.version}>@{libraryVersion}</span> : null}
          </div>
          {!hideBenchmarkName ? (
            <div style={styles.benchmarkName}>
              {benchmarkName}{sampleCountText}
            </div>
          ) : sampleCountText ? (
            <div style={styles.benchmarkName}>{sampleCountText.trim()}</div>
          ) : null}
        </div>
        <div style={styles.right}>
          {isInProgress ? (
            <div style={styles.inProgress}>Running...</div>
          ) : (
            <div data-testid={benchmarkName + ' results'}>
              <div style={styles.meanTime}>
                {fmt(mean)} <span style={styles.plusMinus}>±</span>{fmt(stdDev)} ms
              </div>
              <div style={styles.breakdown}>
                scripting {fmt(meanScripting)} / layout {fmt(meanLayout)} ms
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--bench-border)',
    fontFamily: font,
    fontSize: 13,
  },
  left: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  libraryName: {
    fontWeight: 600,
    color: 'var(--bench-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  version: {
    fontWeight: 400,
    color: 'var(--bench-text-muted)',
    fontSize: 11,
    marginLeft: 2,
  },
  benchmarkName: {
    color: 'var(--bench-text-secondary)',
    fontSize: 12,
    marginTop: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  right: {
    marginLeft: 16,
    textAlign: 'right',
    flexShrink: 0,
  },
  meanTime: {
    fontFamily: monoFont,
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--bench-text)',
  },
  plusMinus: {
    color: 'var(--bench-text-muted)',
    fontWeight: 400,
  },
  breakdown: {
    fontFamily: monoFont,
    fontSize: 11,
    color: 'var(--bench-text-muted)',
    marginTop: 1,
  },
  inProgress: {
    color: 'var(--bench-accent)',
    fontWeight: 500,
    fontSize: 12,
  },
};

export default ReportCard;
