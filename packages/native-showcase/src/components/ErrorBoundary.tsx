import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Contains a render failure to the smallest subtree that can hold it.
 *
 * Used at two depths. Around each widget, so one throwing widget cannot
 * unmount the catalog: the list stays mounted and scroll position is
 * simply never lost. Around the whole screen, so a failure above the
 * catalog shows a recoverable panel instead of a blank app.
 *
 * The widget-level use is the important one. When the catalog unmounts,
 * position has to be rebuilt from AsyncStorage against a cold virtualized
 * list, which is best-effort by nature; an intermittent error then reads
 * as "the app jumped back to the top". Not unmounting is the only way to
 * make that exact.
 *
 * Retry bumps a key rather than only clearing the error, so the subtree
 * genuinely remounts and a transient failure can clear without a reload.
 */

const Panel = styled.View`
  gap: ${t.space.xs}px;
  padding: ${t.space.md}px;
  border-width: ${t.borderWidth.hairline}px;
  border-color: light-dark(#b04a4a, #e08b8b);
  background-color: light-dark(#fdf3f3, #2a1c1c);
`;

const Heading = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: light-dark(#8c2f2f, #e08b8b);
`;

const Message = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  color: ${t.colors.ink};
`;

const RetryButton = styled.Pressable`
  align-self: flex-start;
  margin-top: ${t.space.xxs}px;
  padding: ${t.space.xxs}px ${t.space.xs}px;
  border-width: ${t.borderWidth.hairline}px;
  border-color: light-dark(#b04a4a, #e08b8b);
`;

const RetryLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  color: light-dark(#8c2f2f, #e08b8b);
`;

const ScreenFill = styled.View`
  flex: 1;
  justify-content: center;
  padding: ${t.space.lg}px;
`;

interface Props {
  /** Named in the log and the panel so a failure points somewhere. */
  label: string;
  /** `screen` centers the panel in an otherwise empty viewport. */
  variant?: 'widget' | 'screen';
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  attempt: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  // Deliberately no componentDidCatch logging. React already reports a
  // caught error to LogBox with its component stack, and adding a
  // console.error here raises a second full-screen overlay the developer
  // has to dismiss on top of the first one.

  private handleRetry = () => {
    this.setState(s => ({ error: null, attempt: s.attempt + 1 }));
  };

  render() {
    const { error, attempt } = this.state;
    const { children, label, variant = 'widget' } = this.props;
    if (error === null) {
      return <React.Fragment key={attempt}>{children}</React.Fragment>;
    }
    const panel = (
      <Panel accessibilityRole="alert">
        <Heading>{variant === 'screen' ? 'Screen error' : 'Widget error'}</Heading>
        <Message>
          {label}: {error.message || String(error)}
        </Message>
        <RetryButton
          accessibilityRole="button"
          accessibilityLabel="Retry rendering"
          onPress={this.handleRetry}
        >
          <RetryLabel>Retry</RetryLabel>
        </RetryButton>
      </Panel>
    );
    return variant === 'screen' ? <ScreenFill>{panel}</ScreenFill> : panel;
  }
}
