'use client';

import { useState, useCallback, useId, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useAutoRun, useRenderTimer } from '../lib/use-render-timer';
import { TimerDisplay } from '../lib/timer-display';
import { generateFormFields, type FormFieldData } from '../lib/data-generators';

interface FieldState {
  value: string;
  hasError: boolean;
  isFocused: boolean;
}

type FormState = Record<string, FieldState>;

const SECTION_SIZES = [6, 6, 6, 6, 6] as const;

const SECTION_LABELS = ['Personal Info', 'Contact', 'Employment', 'Access', 'Preferences'] as const;

function buildInitialState(fields: FormFieldData[]): FormState {
  const state: FormState = {};
  for (const f of fields) {
    state[f.id] = { value: '', hasError: false, isFocused: false };
  }
  return state;
}

const allFields = generateFormFields(30);

const sections = SECTION_LABELS.map((label, i) => ({
  label,
  fields: allFields.slice(i * 6, i * 6 + SECTION_SIZES[i]),
}));

export default function FormPage() {
  const [formState, setFormState] = useState<FormState>(() => buildInitialState(allFields));
  const { timings, markStart, clear } = useRenderTimer();
  const titleId = useId();
  const handleValidateAll = useCallback(() => {
    markStart('Validate All');
    setFormState(prev => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        next[id] = { ...next[id], hasError: next[id].value.trim() === '' };
      }
      return next;
    });
  }, [markStart]);

  const handleReset = useCallback(() => {
    markStart('Reset');
    setFormState(buildInitialState(allFields));
  }, [markStart]);

  const toggleRef = useRef(false);
  const handleAutoAction = useCallback(() => {
    toggleRef.current = !toggleRef.current;
    if (toggleRef.current) {
      handleValidateAll();
    } else {
      handleReset();
    }
  }, [handleValidateAll, handleReset]);

  const { autoRun, start, stop } = useAutoRun(handleAutoAction, 50);

  const handleChange = useCallback((id: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [id]: { ...prev[id], value, hasError: false },
    }));
  }, []);

  const handleFocus = useCallback((id: string) => {
    setFormState(prev => ({ ...prev, [id]: { ...prev[id], isFocused: true } }));
  }, []);

  const handleBlur = useCallback((id: string) => {
    setFormState(prev => ({ ...prev, [id]: { ...prev[id], isFocused: false } }));
  }, []);

  const errorCount = Object.values(formState).filter(f => f.hasError).length;

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle id={titleId}>Settings Form</PageTitle>
        <PageSubtitle>~30 inputs · ~20 styled components · heavy attrs chaining</PageSubtitle>
      </PageHeader>

      <TimerDisplay
        timings={timings}
        onClear={clear}
        autoRun={autoRun}
        onAutoStart={start}
        onAutoStop={stop}
      />

      <ActionBar>
        <ValidateButton onClick={handleValidateAll}>Validate All</ValidateButton>
        <ResetButton onClick={handleReset}>Reset</ResetButton>
        {errorCount > 0 && (
          <ErrorBadge role="status">
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </ErrorBadge>
        )}
      </ActionBar>

      <FormElement aria-labelledby={titleId} noValidate>
        {sections.map(section => (
          <Fieldset key={section.label}>
            <Legend>{section.label}</Legend>
            <FieldGrid>
              {section.fields.map(field => {
                const state = formState[field.id];
                return (
                  <FieldGroup key={field.id}>
                    <FieldLabel
                      htmlFor={field.id}
                      $hasError={state.hasError}
                      $isFocused={state.isFocused}
                    >
                      {field.label}
                    </FieldLabel>
                    <StyledRequiredInput
                      id={field.id}
                      value={state.value}
                      $hasError={state.hasError}
                      $isFocused={state.isFocused}
                      onChange={e => handleChange(field.id, e.target.value)}
                      onFocus={() => handleFocus(field.id)}
                      onBlur={() => handleBlur(field.id)}
                    />
                    {state.hasError && <ErrorText role="alert">{field.errorMessage}</ErrorText>}
                  </FieldGroup>
                );
              })}
            </FieldGrid>
          </Fieldset>
        ))}
      </FormElement>
    </PageWrapper>
  );
}

interface TransientFieldProps {
  $hasError: boolean;
  $isFocused: boolean;
}

const focusRing = css<TransientFieldProps>`
  outline: 2px solid ${p => (p.$hasError ? p.theme.colors.danger : p.theme.colors.primary)};
  outline-offset: 2px;
`;

const PageWrapper = styled.div`
  max-width: 900px;
`;

const PageHeader = styled.header`
  margin-bottom: ${p => p.theme.spacing.medium};
`;

const PageTitle = styled.h1`
  font-family: ${p => p.theme.typography.fontFamily};
  font-size: ${p => p.theme.typography.fontSize.large};
  color: ${p => p.theme.colors.text};
  margin: 0 0 4px;
`;

const PageSubtitle = styled.p`
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  margin: 0;
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.small};
  margin-bottom: ${p => p.theme.spacing.medium};
`;

const BaseButton = styled.button`
  font-family: ${p => p.theme.typography.fontFamily};
  font-size: ${p => p.theme.typography.fontSize.small};
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  font-weight: 600;
  transition: opacity 0.1s;

  &:hover {
    opacity: 0.85;
  }

  &:active {
    opacity: 0.7;
  }
`;

const ValidateButton = styled(BaseButton)`
  background: ${p => p.theme.colors.primary};
  color: #fff;
`;

const ResetButton = styled(BaseButton)`
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  border: 1px solid ${p => p.theme.colors.border};
`;

const ErrorBadge = styled.span`
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.danger};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.danger};
  border-radius: 12px;
  padding: 3px 10px;
  font-weight: 600;
`;

const FormElement = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing.large};
`;

const Fieldset = styled.fieldset`
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  padding: ${p => p.theme.spacing.medium};
  background: ${p => p.theme.colors.surface};
  margin: 0;
`;

const Legend = styled.legend`
  font-family: ${p => p.theme.typography.fontFamily};
  font-size: ${p => p.theme.typography.fontSize.medium};
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  padding: 0 8px;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${p => p.theme.spacing.medium};
  margin-top: ${p => p.theme.spacing.small};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.label<TransientFieldProps>`
  font-family: ${p => p.theme.typography.fontFamily};
  font-size: ${p => p.theme.typography.fontSize.small};
  font-weight: 500;
  color: ${p =>
    p.$hasError
      ? p.theme.colors.danger
      : p.$isFocused
      ? p.theme.colors.primary
      : p.theme.colors.text};
  transition: color 0.15s;
`;

const ErrorText = styled.span`
  font-size: 11px;
  color: ${p => p.theme.colors.danger};
  font-family: ${p => p.theme.typography.fontFamily};
`;

const BaseInput = styled.input.attrs({ type: 'text' })<TransientFieldProps>`
  font-family: ${p => p.theme.typography.fontFamily};
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.background};
  border: 1px solid
    ${p =>
      p.$hasError
        ? p.theme.colors.danger
        : p.$isFocused
        ? p.theme.colors.primary
        : p.theme.colors.border};
  border-radius: 6px;
  padding: 7px 10px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &::placeholder {
    color: ${p => p.theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    ${focusRing};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LabeledInput = styled(BaseInput).attrs({
  autoComplete: 'off',
  spellCheck: false,
})`
  letter-spacing: 0.01em;
`;

const StyledRequiredInput = styled(LabeledInput).attrs<TransientFieldProps>(p => ({
  'aria-required': 'true',
  'aria-invalid': p.$hasError ? 'true' : 'false',
}))`
  &:placeholder-shown {
    border-style: ${p => (p.$hasError ? 'solid' : 'dashed')};
    border-color: ${p => (p.$hasError ? p.theme.colors.danger : p.theme.colors.border)};
  }
`;
