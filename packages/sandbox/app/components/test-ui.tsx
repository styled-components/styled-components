/**
 * Shared styled components for sandbox test pages.
 * Both RSC and client pages import from here to keep styling consistent.
 */
import styled from 'styled-components';
import theme from '../lib/theme';

export const Section = styled.section`
  margin-bottom: 40px;
`;

export const SectionTitle = styled.h2`
  font-size: 18px;
  color: ${theme.colors.text};
  margin-bottom: 4px;
`;

export const SectionDesc = styled.p`
  color: ${theme.colors.textMuted};
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
`;

export const HintText = styled.p`
  color: ${theme.colors.textMuted};
  font-size: 12px;
  font-style: italic;
  margin-bottom: 16px;
`;

export const Demo = styled.div`
  padding: 20px;
  border: 1px solid ${theme.colors.border};
  border-radius: 8px;
  background: ${theme.colors.surface};
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ColumnLabel = styled.span`
  font-size: 13px;
  color: ${theme.colors.textMuted};
`;

export const Code = styled.code`
  background: ${theme.colors.border};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
`;
