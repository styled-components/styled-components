'use client';

import React from 'react';
import styled, { css } from 'styled-components';

const Type01 = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  font-size: ${p =>
    p.$size === 'sm'
      ? p.theme.typography.fontSize.small
      : p.$size === 'md'
      ? p.theme.typography.fontSize.medium
      : p.theme.typography.fontSize.large};
  color: ${p => p.theme.colors.text};
`;

const Type02 = styled.span<{ $variant: 'primary' | 'secondary' | 'ghost' }>`
  color: ${p =>
    p.$variant === 'primary'
      ? p.theme.colors.primary
      : p.$variant === 'secondary'
      ? p.theme.colors.secondary
      : p.theme.colors.textMuted};
  background: ${p => p.theme.colors.surface};
`;

const Type03 = styled.button<{ $isActive: boolean }>`
  background: ${p => (p.$isActive ? p.theme.colors.primary : p.theme.colors.surface)};
  color: ${p => (p.$isActive ? p.theme.colors.background : p.theme.colors.text)};
  border: 1px solid ${p => p.theme.colors.border};
`;

const Type04 = styled.div<{ $color: string }>`
  color: ${p => p.$color || p.theme.colors.text};
  border-color: ${p => p.theme.colors.border};
`;

const Type05 = styled.div<{ $padding: number }>`
  padding: ${p => p.$padding}px;
  background: ${p => p.theme.colors.background};
`;

const Type06 = styled.a<{ $size: 'sm' | 'md' | 'lg'; $variant: 'primary' | 'secondary' | 'ghost' }>`
  font-size: ${p =>
    p.$size === 'lg' ? p.theme.typography.fontSize.large : p.theme.typography.fontSize.small};
  color: ${p => (p.$variant === 'primary' ? p.theme.colors.primary : p.theme.colors.secondary)};
  text-decoration: none;
`;

const Type07 = styled.button<{ $isActive: boolean; $variant: 'primary' | 'secondary' | 'ghost' }>`
  background: ${p => (p.$isActive ? p.theme.colors.primary : 'transparent')};
  color: ${p => (p.$variant === 'ghost' ? p.theme.colors.textMuted : p.theme.colors.text)};
  border: 1px solid ${p => p.theme.colors.border};
  cursor: pointer;
`;

const Type08 = styled.div<{ $color: string; $padding: number }>`
  color: ${p => p.$color || p.theme.colors.accent};
  padding: ${p => p.$padding}px;
  background: ${p => p.theme.colors.surface};
`;

const Type09 = styled.span<{ $size: 'sm' | 'md' | 'lg'; $isActive: boolean }>`
  font-size: ${p =>
    p.$size === 'sm' ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.medium};
  opacity: ${p => (p.$isActive ? 1 : 0.5)};
  color: ${p => p.theme.colors.text};
`;

const Type10 = styled.div<{ $variant: 'primary' | 'secondary' | 'ghost'; $padding: number }>`
  padding: ${p => p.$padding}px;
  border-left: 3px solid
    ${p =>
      p.$variant === 'primary'
        ? p.theme.colors.primary
        : p.$variant === 'secondary'
        ? p.theme.colors.secondary
        : p.theme.colors.border};
  background: ${p => p.theme.colors.background};
`;

const Type11 = styled.div<{ $size: 'sm' | 'md' | 'lg'; $color: string; $isActive: boolean }>`
  font-size: ${p =>
    p.$size === 'lg' ? p.theme.typography.fontSize.large : p.theme.typography.fontSize.small};
  color: ${p => p.$color || p.theme.colors.text};
  font-weight: ${p => (p.$isActive ? 700 : 400)};
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Type12 = styled.button<{
  $variant: 'primary' | 'secondary' | 'ghost';
  $isActive: boolean;
  $padding: number;
}>`
  padding: ${p => p.$padding}px ${p => p.$padding * 2}px;
  background: ${p =>
    p.$isActive
      ? p.theme.colors.primary
      : p.$variant === 'secondary'
      ? p.theme.colors.secondary
      : 'transparent'};
  color: ${p => (p.$isActive ? p.theme.colors.background : p.theme.colors.text)};
  border: 1px solid ${p => p.theme.colors.border};
`;

const Type13 = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  width: ${p => (p.$size === 'sm' ? '80px' : p.$size === 'md' ? '120px' : '200px')};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
`;

const Type14 = styled.span<{ $color: string; $variant: 'primary' | 'secondary' | 'ghost' }>`
  color: ${p => p.$color || p.theme.colors.text};
  background: ${p =>
    p.$variant === 'primary' ? p.theme.colors.primary + '22' : p.theme.colors.surface};
  padding: 2px 6px;
  border-radius: 4px;
`;

const Type15 = styled.a<{ $isActive: boolean; $padding: number }>`
  display: inline-block;
  padding: ${p => p.$padding}px;
  color: ${p => (p.$isActive ? p.theme.colors.primary : p.theme.colors.textMuted)};
  text-decoration: ${p => (p.$isActive ? 'underline' : 'none')};
  background: ${p => p.theme.colors.background};
`;

const Type16 = styled.div<{
  $size: 'sm' | 'md' | 'lg';
  $variant: 'primary' | 'secondary' | 'ghost';
  $color: string;
}>`
  height: ${p => (p.$size === 'sm' ? '32px' : p.$size === 'md' ? '40px' : '48px')};
  color: ${p => p.$color || p.theme.colors.text};
  border: 1px solid
    ${p => (p.$variant === 'primary' ? p.theme.colors.primary : p.theme.colors.border)};
  background: ${p => p.theme.colors.surface};
`;

const Type17 = styled.button<{ $isActive: boolean; $color: string }>`
  color: ${p => p.$color || p.theme.colors.text};
  background: ${p => (p.$isActive ? p.theme.colors.accent : p.theme.colors.background)};
  border: none;
  cursor: pointer;
`;

const Type18 = styled.div<{ $padding: number; $isActive: boolean }>`
  padding: ${p => p.$padding}px;
  border: ${p =>
    p.$isActive ? `2px solid ${p.theme.colors.primary}` : `1px solid ${p.theme.colors.border}`};
  background: ${p => p.theme.colors.background};
`;

const Type19 = styled.span<{
  $size: 'sm' | 'md' | 'lg';
  $padding: number;
  $variant: 'primary' | 'secondary' | 'ghost';
}>`
  font-size: ${p =>
    p.$size === 'sm' ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.medium};
  padding: ${p => p.$padding}px;
  color: ${p => (p.$variant === 'primary' ? p.theme.colors.primary : p.theme.colors.text)};
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Type20 = styled.div<{
  $color: string;
  $padding: number;
  $isActive: boolean;
  $variant: 'primary' | 'secondary' | 'ghost';
}>`
  color: ${p => p.$color || p.theme.colors.text};
  padding: ${p => p.$padding}px;
  opacity: ${p => (p.$isActive ? 1 : 0.7)};
  background: ${p => (p.$variant === 'ghost' ? 'transparent' : p.theme.colors.surface)};
  border: 1px solid ${p => p.theme.colors.border};
`;

const Type21 = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  min-height: ${p => (p.$size === 'sm' ? '24px' : p.$size === 'md' ? '36px' : '56px')};
  color: ${p => p.theme.colors.success};
  background: ${p => p.theme.colors.background};
`;

const Type22 = styled.button<{ $variant: 'primary' | 'secondary' | 'ghost' }>`
  outline: 2px solid
    ${p =>
      p.$variant === 'primary'
        ? p.theme.colors.primary
        : p.$variant === 'secondary'
        ? p.theme.colors.secondary
        : 'transparent'};
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
  cursor: pointer;
`;

const Type23 = styled.a<{ $isActive: boolean }>`
  font-weight: ${p => (p.$isActive ? 600 : 400)};
  color: ${p => (p.$isActive ? p.theme.colors.accent : p.theme.colors.textMuted)};
  text-decoration: none;
  background: ${p => p.theme.colors.background};
`;

const Type24 = styled.div<{ $color: string }>`
  border-top: 2px solid ${p => p.$color || p.theme.colors.primary};
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.surface};
`;

const Type25 = styled.span<{ $padding: number }>`
  line-height: ${p => (p.$padding > 8 ? 1.6 : 1.4)};
  padding: 0 ${p => p.$padding}px;
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.background};
`;

const Type26 = styled.div<{ $size: 'sm' | 'md' | 'lg'; $isActive: boolean }>`
  border-radius: ${p => (p.$size === 'sm' ? '4px' : p.$size === 'md' ? '8px' : '16px')};
  background: ${p => (p.$isActive ? p.theme.colors.primary + '1a' : p.theme.colors.surface)};
  color: ${p => p.theme.colors.text};
`;

const Type27 = styled.button<{ $variant: 'primary' | 'secondary' | 'ghost'; $color: string }>`
  color: ${p =>
    p.$color || (p.$variant === 'primary' ? p.theme.colors.background : p.theme.colors.text)};
  background: ${p =>
    p.$variant === 'primary'
      ? p.theme.colors.primary
      : p.$variant === 'secondary'
      ? p.theme.colors.secondary
      : 'transparent'};
  border: 1px solid ${p => p.theme.colors.border};
  cursor: pointer;
`;

const Type28 = styled.div<{ $padding: number; $variant: 'primary' | 'secondary' | 'ghost' }>`
  padding: ${p => p.$padding}px;
  box-shadow: ${p => (p.$variant === 'ghost' ? 'none' : `0 2px 8px ${p.theme.colors.border}`)};
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
`;

const Type29 = styled.span<{
  $size: 'sm' | 'md' | 'lg';
  $color: string;
  $isActive: boolean;
  $variant: 'primary' | 'secondary' | 'ghost';
}>`
  font-size: ${p =>
    p.$size === 'lg' ? p.theme.typography.fontSize.large : p.theme.typography.fontSize.small};
  color: ${p => p.$color || (p.$isActive ? p.theme.colors.primary : p.theme.colors.text)};
  background: ${p => (p.$variant === 'primary' ? p.theme.colors.primary + '11' : 'transparent')};
`;

const Type30 = styled.div<{ $isActive: boolean; $color: string; $padding: number }>`
  padding: ${p => p.$padding}px;
  color: ${p => p.$color || p.theme.colors.danger};
  border: 1px solid ${p => (p.$isActive ? p.theme.colors.danger : p.theme.colors.border)};
  background: ${p => p.theme.colors.background};
`;

const Type31 = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  gap: ${p =>
    p.$size === 'sm'
      ? p.theme.spacing.small
      : p.$size === 'md'
      ? p.theme.spacing.medium
      : p.theme.spacing.large};
  display: flex;
  flex-wrap: wrap;
  color: ${p => p.theme.colors.text};
`;

const Type32 = styled.a<{ $variant: 'primary' | 'secondary' | 'ghost'; $isActive: boolean }>`
  color: ${p =>
    p.$isActive
      ? p.theme.colors.primary
      : p.$variant === 'secondary'
      ? p.theme.colors.secondary
      : p.theme.colors.textMuted};
  text-decoration: none;
  background: ${p => p.theme.colors.background};
`;

const Type33 = styled.button<{ $color: string; $padding: number; $size: 'sm' | 'md' | 'lg' }>`
  color: ${p => p.$color || p.theme.colors.warning};
  padding: ${p => p.$padding}px;
  font-size: ${p =>
    p.$size === 'sm' ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.medium};
  background: ${p => p.theme.colors.background};
  border: none;
  cursor: pointer;
`;

const Type34 = styled.div<{ $isActive: boolean; $variant: 'primary' | 'secondary' | 'ghost' }>`
  transform: ${p => (p.$isActive ? 'scale(1.02)' : 'scale(1)')};
  background: ${p => (p.$variant === 'primary' ? p.theme.colors.primary : p.theme.colors.surface)};
  color: ${p => (p.$variant === 'primary' ? p.theme.colors.background : p.theme.colors.text)};
  transition: transform 0.15s;
`;

const Type35 = styled.span<{ $padding: number; $color: string }>`
  padding: ${p => p.$padding / 2}px ${p => p.$padding}px;
  color: ${p => p.$color || p.theme.colors.accent};
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: ${p => p.theme.typography.fontSize.small};
`;

const Type36 = styled.div<{
  $size: 'sm' | 'md' | 'lg';
  $padding: number;
  $isActive: boolean;
  $color: string;
}>`
  width: ${p => (p.$size === 'sm' ? '60px' : p.$size === 'md' ? '100px' : '160px')};
  padding: ${p => p.$padding}px;
  color: ${p => p.$color || p.theme.colors.text};
  background: ${p => (p.$isActive ? p.theme.colors.surface : p.theme.colors.background)};
`;

const Type37 = styled.button<{
  $variant: 'primary' | 'secondary' | 'ghost';
  $padding: number;
  $isActive: boolean;
}>`
  padding: ${p => p.$padding}px;
  background: ${p =>
    p.$isActive
      ? p.theme.colors.success
      : p.$variant === 'primary'
      ? p.theme.colors.primary
      : p.theme.colors.surface};
  color: ${p =>
    p.$isActive || p.$variant === 'primary' ? p.theme.colors.background : p.theme.colors.text};
  border: none;
  cursor: pointer;
`;

const Type38 = styled.a<{ $color: string; $isActive: boolean; $size: 'sm' | 'md' | 'lg' }>`
  color: ${p => p.$color || p.theme.colors.secondary};
  font-size: ${p =>
    p.$size === 'sm' ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.large};
  font-weight: ${p => (p.$isActive ? 700 : 400)};
  text-decoration: none;
  background: ${p => p.theme.colors.background};
`;

const Type39 = styled.div<{
  $padding: number;
  $variant: 'primary' | 'secondary' | 'ghost';
  $color: string;
  $isActive: boolean;
}>`
  padding: ${p => p.$padding}px;
  color: ${p => p.$color || p.theme.colors.text};
  background: ${p => (p.$isActive ? p.theme.colors.primary + '0d' : 'transparent')};
  border-bottom: 2px solid
    ${p => (p.$variant === 'primary' ? p.theme.colors.primary : p.theme.colors.border)};
`;

const Type40 = styled.span<{
  $size: 'sm' | 'md' | 'lg';
  $variant: 'primary' | 'secondary' | 'ghost';
}>`
  font-size: ${p =>
    p.$size === 'sm'
      ? p.theme.typography.fontSize.small
      : p.$size === 'md'
      ? p.theme.typography.fontSize.medium
      : p.theme.typography.fontSize.large};
  color: ${p =>
    p.$variant === 'primary'
      ? p.theme.colors.primary
      : p.$variant === 'secondary'
      ? p.theme.colors.secondary
      : p.theme.colors.textMuted};
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Type41 = styled.div<{ $isActive: boolean }>`
  border-left: 4px solid ${p => (p.$isActive ? p.theme.colors.primary : p.theme.colors.border)};
  padding-left: ${p => p.theme.spacing.small};
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.background};
`;

const Type42 = styled.button<{ $color: string }>`
  color: ${p => p.$color};
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 6px;
  cursor: pointer;
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Type43 = styled.div<{ $padding: number; $size: 'sm' | 'md' | 'lg' }>`
  padding: ${p => p.$padding}px;
  font-size: ${p =>
    p.$size === 'lg' ? p.theme.typography.fontSize.large : p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  background: ${p => p.theme.colors.surface};
`;

const Type44 = styled.a<{
  $variant: 'primary' | 'secondary' | 'ghost';
  $padding: number;
  $color: string;
}>`
  padding: ${p => p.$padding}px;
  color: ${p => p.$color || p.theme.colors.primary};
  border-bottom: 1px solid
    ${p => (p.$variant === 'primary' ? p.theme.colors.primary : 'transparent')};
  text-decoration: none;
  background: ${p => p.theme.colors.background};
`;

const Type45 = styled.span<{ $isActive: boolean; $color: string; $padding: number }>`
  display: inline-flex;
  align-items: center;
  padding: 0 ${p => p.$padding}px;
  color: ${p => p.$color || p.theme.colors.text};
  background: ${p => (p.$isActive ? p.theme.colors.accent + '33' : p.theme.colors.background)};
  font-size: ${p => p.theme.typography.fontSize.small};
`;

const Type46 = styled.div<{
  $size: 'sm' | 'md' | 'lg';
  $isActive: boolean;
  $variant: 'primary' | 'secondary' | 'ghost';
  $padding: number;
}>`
  padding: ${p => p.$padding}px;
  border-radius: ${p => (p.$size === 'sm' ? '2px' : '6px')};
  background: ${p =>
    p.$isActive
      ? p.theme.colors.primary
      : p.$variant === 'ghost'
      ? 'transparent'
      : p.theme.colors.surface};
  color: ${p => (p.$isActive ? p.theme.colors.background : p.theme.colors.text)};
  border: 1px solid ${p => p.theme.colors.border};
`;

const Type47 = styled.button<{ $color: string; $isActive: boolean }>`
  background: ${p => (p.$isActive ? p.$color || p.theme.colors.danger : p.theme.colors.surface)};
  color: ${p => (p.$isActive ? p.theme.colors.background : p.theme.colors.text)};
  border: 1px solid ${p => p.$color || p.theme.colors.border};
  cursor: pointer;
`;

const Type48 = styled.div<{
  $variant: 'primary' | 'secondary' | 'ghost';
  $size: 'sm' | 'md' | 'lg';
  $color: string;
}>`
  color: ${p => p.$color || p.theme.colors.text};
  background: ${p =>
    p.$variant === 'primary' ? p.theme.colors.primary + '11' : p.theme.colors.background};
  font-size: ${p =>
    p.$size === 'sm' ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.large};
  border: 1px solid ${p => p.theme.colors.border};
`;

const Type49 = styled.a<{
  $isActive: boolean;
  $variant: 'primary' | 'secondary' | 'ghost';
  $padding: number;
  $size: 'sm' | 'md' | 'lg';
}>`
  padding: ${p => p.$padding}px;
  font-size: ${p =>
    p.$size === 'sm' ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.medium};
  color: ${p =>
    p.$isActive
      ? p.theme.colors.primary
      : p.$variant === 'ghost'
      ? p.theme.colors.textMuted
      : p.theme.colors.text};
  text-decoration: none;
  background: ${p => p.theme.colors.background};
`;

const Type50 = styled.div<{
  $color: string;
  $padding: number;
  $isActive: boolean;
  $size: 'sm' | 'md' | 'lg';
  $variant: 'primary' | 'secondary' | 'ghost';
}>`
  padding: ${p => p.$padding}px;
  font-size: ${p =>
    p.$size === 'sm'
      ? p.theme.typography.fontSize.small
      : p.$size === 'md'
      ? p.theme.typography.fontSize.medium
      : p.theme.typography.fontSize.large};
  color: ${p => p.$color || p.theme.colors.text};
  background: ${p =>
    p.$isActive
      ? p.theme.colors.primary + '0d'
      : p.$variant === 'primary'
      ? p.theme.colors.surface
      : p.theme.colors.background};
  border: 1px solid ${p => p.theme.colors.border};
  font-family: ${p => p.theme.typography.fontFamily};
`;

// ---------------------------------------------------------------------------
// Composition chains — Chain01 through Chain20
// ---------------------------------------------------------------------------

const Chain01Base = styled.div<{ $bg: string }>`
  background: ${p => p.$bg || p.theme.colors.surface};
  padding: ${p => p.theme.spacing.small};
`;
const Chain01Ext1 = styled(Chain01Base)<{ $border: boolean }>`
  border: ${p => (p.$border ? `1px solid ${p.theme.colors.border}` : 'none')};
`;
const Chain01Ext2 = styled(Chain01Ext1)<{ $rounded: boolean }>`
  border-radius: ${p => (p.$rounded ? '8px' : '0')};
  color: ${p => p.theme.colors.text};
`;
const Chain01 = styled(Chain01Ext2)<{ $shadow: 'sm' | 'md' | 'lg' }>`
  box-shadow: ${p =>
    `0 ${p.$shadow === 'sm' ? 1 : p.$shadow === 'md' ? 4 : 8}px 16px ${p.theme.colors.border}`};
`;

const Chain02Base = styled.span<{ $color: string }>`
  color: ${p => p.$color || p.theme.colors.primary};
  font-family: ${p => p.theme.typography.fontFamily};
`;
const Chain02 = styled(Chain02Base)<{ $weight: boolean }>`
  font-weight: ${p => (p.$weight ? 700 : 400)};
  background: ${p => p.theme.colors.background};
`;

const Chain03Base = styled.button<{ $variant: 'primary' | 'secondary' | 'ghost' }>`
  background: ${p =>
    p.$variant === 'primary'
      ? p.theme.colors.primary
      : p.$variant === 'secondary'
      ? p.theme.colors.secondary
      : 'transparent'};
  color: ${p => (p.$variant === 'primary' ? p.theme.colors.background : p.theme.colors.text)};
  border: 1px solid ${p => p.theme.colors.border};
  cursor: pointer;
`;
const Chain03Ext1 = styled(Chain03Base)<{ $size: 'sm' | 'md' | 'lg' }>`
  padding: ${p => (p.$size === 'sm' ? '4px 8px' : p.$size === 'md' ? '8px 16px' : '12px 24px')};
  font-size: ${p =>
    p.$size === 'sm' ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.medium};
`;
const Chain03 = styled(Chain03Ext1)<{ $disabled: boolean }>`
  opacity: ${p => (p.$disabled ? 0.4 : 1)};
  pointer-events: ${p => (p.$disabled ? 'none' : 'auto')};
`;

const Chain04Base = styled.div<{ $surface: boolean }>`
  background: ${p => (p.$surface ? p.theme.colors.surface : p.theme.colors.background)};
  color: ${p => p.theme.colors.text};
`;
const Chain04Ext1 = styled(Chain04Base)<{ $padding: number }>`
  padding: ${p => p.$padding}px;
`;
const Chain04Ext2 = styled(Chain04Ext1)<{ $border: boolean }>`
  border: ${p => (p.$border ? `1px solid ${p.theme.colors.border}` : 'none')};
`;
const Chain04 = styled(Chain04Ext2)<{ $accent: 'danger' | 'success' | 'warning' }>`
  border-top: 3px solid ${p => p.theme.colors[p.$accent]};
`;

const Chain05Base = styled.a<{ $muted: boolean }>`
  color: ${p => (p.$muted ? p.theme.colors.textMuted : p.theme.colors.text)};
  text-decoration: none;
`;
const Chain05 = styled(Chain05Base)<{ $underline: boolean }>`
  text-decoration: ${p => (p.$underline ? 'underline' : 'none')};
  background: ${p => p.theme.colors.background};
  font-size: ${p => p.theme.typography.fontSize.small};
`;

const Chain06Base = styled.div<{ $layout: 'row' | 'column' }>`
  display: flex;
  flex-direction: ${p => p.$layout};
  background: ${p => p.theme.colors.background};
`;
const Chain06Ext1 = styled(Chain06Base)<{ $gap: number }>`
  gap: ${p => p.$gap}px;
  color: ${p => p.theme.colors.text};
`;
const Chain06 = styled(Chain06Ext1)<{ $wrap: boolean }>`
  flex-wrap: ${p => (p.$wrap ? 'wrap' : 'nowrap')};
  border: 1px solid ${p => p.theme.colors.border};
`;

const Chain07Base = styled.div<{ $elevation: 0 | 1 | 2 }>`
  box-shadow: ${p =>
    p.$elevation === 0
      ? 'none'
      : p.$elevation === 1
      ? `0 1px 4px ${p.theme.colors.border}`
      : `0 4px 12px ${p.theme.colors.border}`};
  background: ${p => p.theme.colors.surface};
`;
const Chain07Ext1 = styled(Chain07Base)<{ $rounded: boolean }>`
  border-radius: ${p => (p.$rounded ? '12px' : '0')};
  overflow: ${p => (p.$rounded ? 'hidden' : 'visible')};
  color: ${p => p.theme.colors.text};
`;
const Chain07Ext2 = styled(Chain07Ext1)<{ $header: string }>`
  padding-top: ${p => (p.$header ? '40px' : '0')};
  position: relative;
`;
const Chain07 = styled(Chain07Ext2)<{ $interactive: boolean }>`
  cursor: ${p => (p.$interactive ? 'pointer' : 'default')};
  transition: ${p => (p.$interactive ? 'box-shadow 0.15s' : 'none')};
  &:hover {
    box-shadow: ${p => (p.$interactive ? `0 6px 20px ${p.theme.colors.primary}33` : undefined)};
  }
`;

const Chain08Base = styled.span<{ $badge: 'info' | 'warn' | 'error' | 'ok' }>`
  color: ${p =>
    p.$badge === 'ok'
      ? p.theme.colors.success
      : p.$badge === 'error'
      ? p.theme.colors.danger
      : p.$badge === 'warn'
      ? p.theme.colors.warning
      : p.theme.colors.primary};
  font-size: ${p => p.theme.typography.fontSize.small};
`;
const Chain08 = styled(Chain08Base)<{ $pill: boolean }>`
  border-radius: ${p => (p.$pill ? '999px' : '4px')};
  padding: 2px 6px;
  background: currentColor;
  background: ${p => (p.$pill ? p.theme.colors.surface : 'transparent')};
  border: 1px solid currentColor;
`;

const Chain09Base = styled.button<{ $full: boolean }>`
  width: ${p => (p.$full ? '100%' : 'auto')};
  background: ${p => p.theme.colors.primary};
  color: ${p => p.theme.colors.background};
  border: none;
  cursor: pointer;
`;
const Chain09Ext1 = styled(Chain09Base)<{ $loading: boolean }>`
  opacity: ${p => (p.$loading ? 0.7 : 1)};
  pointer-events: ${p => (p.$loading ? 'none' : 'auto')};
`;
const Chain09 = styled(Chain09Ext1)<{ $icon: boolean }>`
  display: ${p => (p.$icon ? 'inline-flex' : 'inline-block')};
  align-items: ${p => (p.$icon ? 'center' : undefined)};
  gap: ${p => (p.$icon ? '6px' : undefined)};
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Chain10Base = styled.div<{ $sticky: boolean }>`
  position: ${p => (p.$sticky ? 'sticky' : 'static')};
  top: 0;
  background: ${p => p.theme.colors.background};
  z-index: ${p => (p.$sticky ? 10 : 'auto')};
`;
const Chain10 = styled(Chain10Base)<{ $bordered: boolean }>`
  border-bottom: ${p => (p.$bordered ? `1px solid ${p.theme.colors.border}` : 'none')};
  color: ${p => p.theme.colors.text};
  padding: ${p => p.theme.spacing.small};
`;

const Chain11Base = styled.div<{ $status: 'online' | 'offline' | 'busy' }>`
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p =>
      p.$status === 'online'
        ? p.theme.colors.success
        : p.$status === 'busy'
        ? p.theme.colors.warning
        : p.theme.colors.danger};
    margin-right: 6px;
  }
  color: ${p => p.theme.colors.text};
`;
const Chain11Ext1 = styled(Chain11Base)<{ $label: boolean }>`
  font-size: ${p =>
    p.$label ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.medium};
`;
const Chain11 = styled(Chain11Ext1)<{ $compact: boolean }>`
  padding: ${p => (p.$compact ? '2px' : p.theme.spacing.small)};
  background: ${p => p.theme.colors.background};
`;

const Chain12Base = styled.div<{ $cols: 1 | 2 | 3 | 4 }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$cols}, 1fr);
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
`;
const Chain12Ext1 = styled(Chain12Base)<{ $gap: number }>`
  gap: ${p => p.$gap}px;
`;
const Chain12Ext2 = styled(Chain12Ext1)<{ $padding: number }>`
  padding: ${p => p.$padding}px;
  border: 1px solid ${p => p.theme.colors.border};
`;
const Chain12 = styled(Chain12Ext2)<{ $centered: boolean }>`
  justify-items: ${p => (p.$centered ? 'center' : 'start')};
  align-items: ${p => (p.$centered ? 'center' : 'start')};
`;

const Chain13Base = styled.span<{ $mono: boolean }>`
  font-family: ${p => (p.$mono ? 'monospace' : p.theme.typography.fontFamily)};
  background: ${p => p.theme.colors.surface};
`;
const Chain13 = styled(Chain13Base)<{ $truncate: boolean }>`
  ${p =>
    p.$truncate
      ? css`
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 120px;
        `
      : ''}
  color: ${p => p.theme.colors.text};
`;

const Chain14Base = styled.div<{ $align: 'left' | 'center' | 'right' }>`
  text-align: ${p => p.$align};
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.background};
`;
const Chain14Ext1 = styled(Chain14Base)<{ $pad: number }>`
  padding: ${p => p.$pad}px;
`;
const Chain14 = styled(Chain14Ext1)<{ $highlight: boolean }>`
  background: ${p => (p.$highlight ? p.theme.colors.primary + '11' : p.theme.colors.background)};
  border-radius: ${p => (p.$highlight ? '4px' : '0')};
`;

const Chain15Base = styled.button<{ $danger: boolean }>`
  background: ${p => (p.$danger ? p.theme.colors.danger : p.theme.colors.primary)};
  color: ${p => p.theme.colors.background};
  border: none;
  cursor: pointer;
`;
const Chain15Ext1 = styled(Chain15Base)<{ $outline: boolean }>`
  background: ${p => (p.$outline ? 'transparent' : undefined)};
  color: ${p => (p.$outline ? p.theme.colors.danger : undefined)};
  border: ${p => (p.$outline ? `1px solid ${p.theme.colors.danger}` : 'none')};
`;
const Chain15Ext2 = styled(Chain15Ext1)<{ $sm: boolean }>`
  padding: ${p => (p.$sm ? '4px 8px' : '8px 16px')};
  font-size: ${p =>
    p.$sm ? p.theme.typography.fontSize.small : p.theme.typography.fontSize.medium};
`;
const Chain15 = styled(Chain15Ext2)<{ $rounded: boolean }>`
  border-radius: ${p => (p.$rounded ? '6px' : '2px')};
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Chain16Base = styled.div<{ $card: boolean }>`
  background: ${p => (p.$card ? p.theme.colors.surface : 'transparent')};
  border: ${p => (p.$card ? `1px solid ${p.theme.colors.border}` : 'none')};
  color: ${p => p.theme.colors.text};
`;
const Chain16 = styled(Chain16Base)<{ $hover: boolean }>`
  transition: ${p => (p.$hover ? 'background 0.15s, border-color 0.15s' : 'none')};
  &:hover {
    background: ${p => (p.$hover ? p.theme.colors.primary + '0d' : undefined)};
  }
`;

const Chain17Base = styled.div<{ $dimmed: boolean }>`
  opacity: ${p => (p.$dimmed ? 0.5 : 1)};
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.background};
`;
const Chain17Ext1 = styled(Chain17Base)<{ $italic: boolean }>`
  font-style: ${p => (p.$italic ? 'italic' : 'normal')};
  font-family: ${p => p.theme.typography.fontFamily};
`;
const Chain17 = styled(Chain17Ext1)<{ $size: 'sm' | 'md' | 'lg' }>`
  font-size: ${p =>
    p.$size === 'sm'
      ? p.theme.typography.fontSize.small
      : p.$size === 'md'
      ? p.theme.typography.fontSize.medium
      : p.theme.typography.fontSize.large};
`;

const Chain18Base = styled.div<{ $outlined: boolean }>`
  border: ${p => (p.$outlined ? `1px solid ${p.theme.colors.primary}` : 'none')};
  color: ${p => p.theme.colors.primary};
  background: ${p => p.theme.colors.background};
`;
const Chain18Ext1 = styled(Chain18Base)<{ $filled: boolean }>`
  background: ${p => (p.$filled ? p.theme.colors.primary + '1a' : 'transparent')};
  padding: ${p => p.theme.spacing.small};
`;
const Chain18Ext2 = styled(Chain18Ext1)<{ $icon: boolean }>`
  padding-left: ${p => (p.$icon ? '32px' : undefined)};
  position: ${p => (p.$icon ? 'relative' : 'static')};
`;
const Chain18 = styled(Chain18Ext2)<{ $block: boolean }>`
  display: ${p => (p.$block ? 'block' : 'inline-flex')};
  width: ${p => (p.$block ? '100%' : 'auto')};
`;

const Chain19Base = styled.span<{ $variant: 'solid' | 'outline' | 'ghost' }>`
  border: ${p => (p.$variant === 'outline' ? `1px solid ${p.theme.colors.secondary}` : 'none')};
  background: ${p => (p.$variant === 'solid' ? p.theme.colors.secondary : 'transparent')};
  color: ${p => (p.$variant === 'solid' ? p.theme.colors.background : p.theme.colors.secondary)};
  font-size: ${p => p.theme.typography.fontSize.small};
`;
const Chain19 = styled(Chain19Base)<{ $upper: boolean }>`
  text-transform: ${p => (p.$upper ? 'uppercase' : 'none')};
  letter-spacing: ${p => (p.$upper ? '0.05em' : 'normal')};
  padding: 2px 8px;
  border-radius: 4px;
`;

const Chain20Base = styled.div<{ $dense: boolean }>`
  line-height: ${p => (p.$dense ? 1.2 : 1.6)};
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.background};
`;
const Chain20Ext1 = styled(Chain20Base)<{ $serif: boolean }>`
  font-family: ${p => (p.$serif ? 'Georgia, serif' : p.theme.typography.fontFamily)};
`;
const Chain20Ext2 = styled(Chain20Ext1)<{ $size: 'sm' | 'md' | 'lg' }>`
  font-size: ${p =>
    p.$size === 'sm'
      ? p.theme.typography.fontSize.small
      : p.$size === 'md'
      ? p.theme.typography.fontSize.medium
      : p.theme.typography.fontSize.large};
`;
const Chain20 = styled(Chain20Ext2)<{ $maxWidth: number }>`
  max-width: ${p => p.$maxWidth}px;
  overflow-wrap: break-word;
  border-left: 3px solid ${p => p.theme.colors.border};
  padding-left: ${p => p.theme.spacing.medium};
`;

// ---------------------------------------------------------------------------
// Attrs chains — Attrs01 through Attrs15
// ---------------------------------------------------------------------------

const Attrs01 = styled.button.attrs({ type: 'button' })`
  background: ${p => p.theme.colors.primary};
  color: ${p => p.theme.colors.background};
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
`;

const Attrs02 = styled.input.attrs({ type: 'text', autoComplete: 'off' })`
  border: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
  padding: 6px 10px;
  border-radius: 4px;
`;

const Attrs03 = styled.div.attrs<{ $level?: number }>(p => ({
  role: 'listitem',
  tabIndex: p.$level ?? 0,
}))`
  padding-left: ${p => (p.$level ?? 0) * 16}px;
  color: ${p => p.theme.colors.text};
  background: ${p => p.theme.colors.background};
`;

const Attrs04 = styled.button.attrs<{ $variant?: 'primary' | 'secondary' }>(p => ({
  type: 'button' as const,
  title: p.$variant ?? 'primary',
}))`
  background: ${p =>
    p.$variant === 'secondary' ? p.theme.colors.secondary : p.theme.colors.primary};
  color: ${p => p.theme.colors.background};
  border: none;
  cursor: pointer;
`;

const Attrs05Base = styled.a.attrs({ rel: 'noopener noreferrer' })`
  color: ${p => p.theme.colors.primary};
  text-decoration: none;
  background: ${p => p.theme.colors.background};
`;
const Attrs05 = styled(Attrs05Base).attrs({ target: '_blank' })`
  &::after {
    content: ' ↗';
    font-size: 0.75em;
    color: ${p => p.theme.colors.textMuted};
  }
`;

const Attrs06 = styled.input.attrs<{ $required?: boolean }>(p => ({
  required: p.$required ?? false,
  'aria-required': p.$required ? 'true' : 'false',
}))`
  border: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
  padding: 6px 10px;
`;

const Attrs07Base = styled.div.attrs({ role: 'region' })`
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  padding: ${p => p.theme.spacing.medium};
`;
const Attrs07 = styled(Attrs07Base).attrs<{ $label?: string }>(p => ({
  'aria-label': p.$label ?? 'region',
}))`
  color: ${p => p.theme.colors.text};
`;

const Attrs08 = styled.button.attrs({ type: 'submit' })`
  width: 100%;
  background: ${p => p.theme.colors.primary};
  color: ${p => p.theme.colors.background};
  border: none;
  cursor: pointer;
  padding: 10px;
  font-family: ${p => p.theme.typography.fontFamily};
  font-size: ${p => p.theme.typography.fontSize.medium};
`;

const Attrs09Base = styled.span.attrs({ role: 'status' })`
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  background: ${p => p.theme.colors.background};
`;
const Attrs09Ext1 = styled(Attrs09Base).attrs({ 'aria-live': 'polite' })`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
`;
const Attrs09 = styled(Attrs09Ext1)<{ $type?: 'error' | 'success' | 'info' }>`
  color: ${p =>
    p.$type === 'error'
      ? p.theme.colors.danger
      : p.$type === 'success'
      ? p.theme.colors.success
      : p.theme.colors.primary};
  border: 1px solid currentColor;
`;

const Attrs10 = styled.img.attrs<{ $alt?: string }>(p => ({
  alt: p.$alt ?? '',
  loading: 'lazy' as const,
}))`
  display: block;
  max-width: 100%;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 4px;
`;

const Attrs11 = styled.label.attrs({ htmlFor: undefined })`
  display: block;
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  margin-bottom: 4px;
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Attrs12Base = styled.div.attrs({ tabIndex: 0 })`
  outline: none;
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
  &:focus-visible {
    box-shadow: 0 0 0 2px ${p => p.theme.colors.primary};
  }
`;
const Attrs12 = styled(Attrs12Base).attrs<{ $role?: string }>(p => ({
  role: p.$role ?? 'presentation',
}))`
  border-radius: 4px;
  padding: 4px;
  border: 1px solid ${p => p.theme.colors.border};
`;

const Attrs13 = styled.select.attrs({ autoComplete: 'off' })`
  border: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
  padding: 6px 10px;
  border-radius: 4px;
  appearance: none;
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Attrs14Base = styled.div.attrs(() => ({ role: 'figure' }))`
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
`;
const Attrs14Ext1 = styled(Attrs14Base).attrs(() => ({ tabIndex: 0 }))`
  cursor: pointer;
  transition: border-color 0.15s;
  color: ${p => p.theme.colors.text};
  &:hover {
    border-color: ${p => p.theme.colors.primary};
  }
`;
const Attrs14 = styled(Attrs14Ext1)<{ $variant?: 'default' | 'feature' }>`
  padding: ${p => (p.$variant === 'feature' ? p.theme.spacing.large : p.theme.spacing.medium)};
`;

const Attrs15 = styled.textarea.attrs({ rows: 4, spellCheck: true })`
  width: 100%;
  border: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.background};
  color: ${p => p.theme.colors.text};
  padding: 8px;
  border-radius: 4px;
  font-family: ${p => p.theme.typography.fontFamily};
  font-size: ${p => p.theme.typography.fontSize.small};
  resize: vertical;
`;

// ---------------------------------------------------------------------------
// Polymorphic as usages — Poly01 through Poly10
// ---------------------------------------------------------------------------

const PolyBase = styled.div<{ $active?: boolean }>`
  display: block;
  padding: 8px 12px;
  border-radius: 6px;
  background: ${p => (p.$active ? p.theme.colors.primary + '1a' : p.theme.colors.surface)};
  color: ${p => (p.$active ? p.theme.colors.primary : p.theme.colors.text)};
  border: 1px solid ${p => (p.$active ? p.theme.colors.primary : p.theme.colors.border)};
  font-family: ${p => p.theme.typography.fontFamily};
`;

function Poly01({ children }: { children: React.ReactNode }) {
  return (
    <PolyBase as="a" href="#poly01" $active>
      {children}
    </PolyBase>
  );
}

function Poly02({ children }: { children: React.ReactNode }) {
  return (
    <PolyBase as="button" type="button">
      {children}
    </PolyBase>
  );
}

function Poly03({ children }: { children: React.ReactNode }) {
  return <PolyBase as="section">{children}</PolyBase>;
}

function Poly04({ children }: { children: React.ReactNode }) {
  return <PolyBase as="label">{children}</PolyBase>;
}

function Poly05({ children }: { children: React.ReactNode }) {
  return (
    <PolyBase as="article" $active>
      {children}
    </PolyBase>
  );
}

function Poly06({ children }: { children: React.ReactNode }) {
  return <PolyBase as="aside">{children}</PolyBase>;
}

function Poly07({ children }: { children: React.ReactNode }) {
  return <PolyBase as="nav">{children}</PolyBase>;
}

function Poly08({ children }: { children: React.ReactNode }) {
  return (
    <PolyBase as="header" $active>
      {children}
    </PolyBase>
  );
}

function Poly09({ children }: { children: React.ReactNode }) {
  return <PolyBase as="footer">{children}</PolyBase>;
}

function Poly10({ children }: { children: React.ReactNode }) {
  return <PolyBase as="main">{children}</PolyBase>;
}

// ---------------------------------------------------------------------------
// Spread prop patterns — Spread01 through Spread10
// ---------------------------------------------------------------------------

const SpreadBase = styled.div<{ $accent?: string }>`
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 6px;
  padding: 8px;
  color: ${p => p.theme.colors.text};
  border-left: 3px solid ${p => p.$accent || p.theme.colors.primary};
`;

function Spread01(props: React.ComponentProps<typeof SpreadBase>) {
  return <SpreadBase {...props} />;
}

function Spread02({ className, ...rest }: React.ComponentProps<typeof SpreadBase>) {
  return <SpreadBase className={className} {...rest} />;
}

function Spread03({ children, $accent, ...rest }: React.ComponentProps<typeof SpreadBase>) {
  return (
    <SpreadBase $accent={$accent ?? '#888'} {...rest}>
      {children}
    </SpreadBase>
  );
}

function Spread04(props: React.ComponentProps<typeof SpreadBase> & { label?: string }) {
  const { label, ...rest } = props;
  return <SpreadBase {...rest}>{label ?? rest.children}</SpreadBase>;
}

function Spread05({ style, ...rest }: React.ComponentProps<typeof SpreadBase>) {
  return <SpreadBase style={{ ...style, fontFamily: 'monospace' }} {...rest} />;
}

function Spread06(props: React.HTMLAttributes<HTMLDivElement> & { $accent?: string }) {
  return <SpreadBase {...props} />;
}

function Spread07({ id, ...rest }: React.ComponentProps<typeof SpreadBase>) {
  return <SpreadBase id={id ?? 'spread07'} {...rest} />;
}

function Spread08(props: React.ComponentProps<typeof SpreadBase> & { 'data-testid'?: string }) {
  return <SpreadBase {...props} />;
}

function Spread09({
  onClick,
  ...rest
}: React.ComponentProps<typeof SpreadBase> & { onClick?: () => void }) {
  return <SpreadBase onClick={onClick} role={onClick ? 'button' : undefined} {...rest} />;
}

function Spread10({
  title,
  ...rest
}: React.ComponentProps<typeof SpreadBase> & { title?: string }) {
  return <SpreadBase title={title} {...rest} />;
}

// ---------------------------------------------------------------------------
// Generic wrapper components — Generic01 through Generic05
// ---------------------------------------------------------------------------

const GenericContainer = styled.div`
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 6px;
  padding: 8px;
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.text};
  font-family: ${p => p.theme.typography.fontFamily};
`;

const GenericLabel = styled.span`
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  display: block;
  margin-bottom: 2px;
`;

function Generic01<T extends { id: string; name: string }>({
  item,
  ...rest
}: { item: T } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <GenericContainer {...rest}>
      <GenericLabel>{item.id}</GenericLabel>
      {item.name}
    </GenericContainer>
  );
}

function Generic02<T extends { id: string; label: string; value: number }>({
  item,
  ...rest
}: { item: T } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <GenericContainer {...rest}>
      <GenericLabel>{item.label}</GenericLabel>
      {item.value}
    </GenericContainer>
  );
}

function Generic03<T extends { id: string; title: string; status: string }>({
  item,
  highlight,
  ...rest
}: { item: T; highlight?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <GenericContainer
      style={highlight ? { outline: '2px solid currentColor' } : undefined}
      {...rest}
    >
      <GenericLabel>{item.title}</GenericLabel>
      {item.status}
    </GenericContainer>
  );
}

function Generic04<T extends { id: string; tags: string[] }>({
  item,
  ...rest
}: { item: T } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <GenericContainer {...rest}>
      <GenericLabel>Tags</GenericLabel>
      {item.tags.join(', ')}
    </GenericContainer>
  );
}

function Generic05<T extends { id: string; meta: Record<string, unknown> }>({
  item,
  renderMeta,
  ...rest
}: {
  item: T;
  renderMeta?: (meta: T['meta']) => React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <GenericContainer {...rest}>
      <GenericLabel>{item.id}</GenericLabel>
      {renderMeta ? renderMeta(item.meta) : JSON.stringify(item.meta).slice(0, 40)}
    </GenericContainer>
  );
}

// ---------------------------------------------------------------------------
// Page layout
// ---------------------------------------------------------------------------

const PageTitle = styled.h1`
  font-size: ${p => p.theme.typography.fontSize.large};
  color: ${p => p.theme.colors.text};
  margin: 0 0 4px;
  font-family: ${p => p.theme.typography.fontFamily};
`;

const PageSubtitle = styled.p`
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  margin: 0 0 24px;
  font-family: ${p => p.theme.typography.fontFamily};
`;

const SectionTitle = styled.h2`
  font-size: ${p => p.theme.typography.fontSize.medium};
  color: ${p => p.theme.colors.text};
  margin: 24px 0 12px;
  font-family: ${p => p.theme.typography.fontFamily};
  border-bottom: 1px solid ${p => p.theme.colors.border};
  padding-bottom: 6px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
`;

const Box = styled.div`
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-family: monospace;
  text-align: center;
  padding: 4px;
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 4px;
  color: ${p => p.theme.colors.textMuted};
  overflow: hidden;
`;

export default function TypesPage() {
  return (
    <div>
      <PageTitle>Type Stress Test</PageTitle>
      <PageSubtitle>
        ~110 styled component definitions. Measure via{' '}
        <code>npx tsc --noEmit --extendedDiagnostics</code>.
      </PageSubtitle>

      <SectionTitle>Basic Components (Type01–Type50)</SectionTitle>
      <Grid>
        <Box>
          <Type01 $size="sm">Type01</Type01>
        </Box>
        <Box>
          <Type02 $variant="primary">Type02</Type02>
        </Box>
        <Box>
          <Type03 $isActive>Type03</Type03>
        </Box>
        <Box>
          <Type04 $color="">Type04</Type04>
        </Box>
        <Box>
          <Type05 $padding={8}>Type05</Type05>
        </Box>
        <Box>
          <Type06 $size="md" $variant="secondary">
            Type06
          </Type06>
        </Box>
        <Box>
          <Type07 $isActive={false} $variant="ghost">
            Type07
          </Type07>
        </Box>
        <Box>
          <Type08 $color="" $padding={6}>
            Type08
          </Type08>
        </Box>
        <Box>
          <Type09 $size="md" $isActive>
            Type09
          </Type09>
        </Box>
        <Box>
          <Type10 $variant="primary" $padding={8}>
            Type10
          </Type10>
        </Box>
        <Box>
          <Type11 $size="sm" $color="" $isActive={false}>
            Type11
          </Type11>
        </Box>
        <Box>
          <Type12 $variant="secondary" $isActive={false} $padding={6}>
            Type12
          </Type12>
        </Box>
        <Box>
          <Type13 $size="md">Type13</Type13>
        </Box>
        <Box>
          <Type14 $color="" $variant="primary">
            Type14
          </Type14>
        </Box>
        <Box>
          <Type15 $isActive $padding={4}>
            Type15
          </Type15>
        </Box>
        <Box>
          <Type16 $size="sm" $variant="ghost" $color="">
            Type16
          </Type16>
        </Box>
        <Box>
          <Type17 $isActive={false} $color="">
            Type17
          </Type17>
        </Box>
        <Box>
          <Type18 $padding={6} $isActive>
            Type18
          </Type18>
        </Box>
        <Box>
          <Type19 $size="md" $padding={4} $variant="primary">
            Type19
          </Type19>
        </Box>
        <Box>
          <Type20 $color="" $padding={6} $isActive={false} $variant="secondary">
            Type20
          </Type20>
        </Box>
        <Box>
          <Type21 $size="md">Type21</Type21>
        </Box>
        <Box>
          <Type22 $variant="primary">Type22</Type22>
        </Box>
        <Box>
          <Type23 $isActive={false}>Type23</Type23>
        </Box>
        <Box>
          <Type24 $color="">Type24</Type24>
        </Box>
        <Box>
          <Type25 $padding={8}>Type25</Type25>
        </Box>
        <Box>
          <Type26 $size="md" $isActive>
            Type26
          </Type26>
        </Box>
        <Box>
          <Type27 $variant="ghost" $color="">
            Type27
          </Type27>
        </Box>
        <Box>
          <Type28 $padding={6} $variant="primary">
            Type28
          </Type28>
        </Box>
        <Box>
          <Type29 $size="sm" $color="" $isActive={false} $variant="ghost">
            Type29
          </Type29>
        </Box>
        <Box>
          <Type30 $isActive $color="" $padding={4}>
            Type30
          </Type30>
        </Box>
        <Box>
          <Type31 $size="lg">Type31</Type31>
        </Box>
        <Box>
          <Type32 $variant="primary" $isActive>
            Type32
          </Type32>
        </Box>
        <Box>
          <Type33 $color="" $padding={6} $size="sm">
            Type33
          </Type33>
        </Box>
        <Box>
          <Type34 $isActive={false} $variant="secondary">
            Type34
          </Type34>
        </Box>
        <Box>
          <Type35 $padding={6} $color="">
            Type35
          </Type35>
        </Box>
        <Box>
          <Type36 $size="sm" $padding={4} $isActive $color="">
            Type36
          </Type36>
        </Box>
        <Box>
          <Type37 $variant="primary" $padding={6} $isActive={false}>
            Type37
          </Type37>
        </Box>
        <Box>
          <Type38 $color="" $isActive $size="md">
            Type38
          </Type38>
        </Box>
        <Box>
          <Type39 $padding={4} $variant="ghost" $color="" $isActive>
            Type39
          </Type39>
        </Box>
        <Box>
          <Type40 $size="md" $variant="secondary">
            Type40
          </Type40>
        </Box>
        <Box>
          <Type41 $isActive>Type41</Type41>
        </Box>
        <Box>
          <Type42 $color="#888">Type42</Type42>
        </Box>
        <Box>
          <Type43 $padding={6} $size="md">
            Type43
          </Type43>
        </Box>
        <Box>
          <Type44 $variant="primary" $padding={4} $color="">
            Type44
          </Type44>
        </Box>
        <Box>
          <Type45 $isActive $color="" $padding={6}>
            Type45
          </Type45>
        </Box>
        <Box>
          <Type46 $size="md" $isActive={false} $variant="primary" $padding={4}>
            Type46
          </Type46>
        </Box>
        <Box>
          <Type47 $color="" $isActive={false}>
            Type47
          </Type47>
        </Box>
        <Box>
          <Type48 $variant="primary" $size="sm" $color="">
            Type48
          </Type48>
        </Box>
        <Box>
          <Type49 $isActive $variant="primary" $padding={4} $size="md">
            Type49
          </Type49>
        </Box>
        <Box>
          <Type50 $color="" $padding={4} $isActive={false} $size="sm" $variant="ghost">
            Type50
          </Type50>
        </Box>
      </Grid>

      <SectionTitle>Composition Chains (Chain01–Chain20)</SectionTitle>
      <Grid>
        <Box>
          <Chain01 $bg="" $border $rounded $shadow="sm">
            Ch01
          </Chain01>
        </Box>
        <Box>
          <Chain02 $color="" $weight>
            Ch02
          </Chain02>
        </Box>
        <Box>
          <Chain03 $variant="primary" $size="sm" $disabled={false}>
            Ch03
          </Chain03>
        </Box>
        <Box>
          <Chain04 $surface $padding={6} $border $accent="success">
            Ch04
          </Chain04>
        </Box>
        <Box>
          <Chain05 $muted={false} $underline>
            Ch05
          </Chain05>
        </Box>
        <Box>
          <Chain06 $layout="row" $gap={8} $wrap={false}>
            Ch06
          </Chain06>
        </Box>
        <Box>
          <Chain07 $elevation={1} $rounded $header="" $interactive>
            Ch07
          </Chain07>
        </Box>
        <Box>
          <Chain08 $badge="ok" $pill>
            Ch08
          </Chain08>
        </Box>
        <Box>
          <Chain09 $full={false} $loading={false} $icon={false}>
            Ch09
          </Chain09>
        </Box>
        <Box>
          <Chain10 $sticky={false} $bordered>
            Ch10
          </Chain10>
        </Box>
        <Box>
          <Chain11 $status="online" $label $compact={false}>
            Ch11
          </Chain11>
        </Box>
        <Box>
          <Chain12 $cols={2} $gap={8} $padding={6} $centered={false}>
            Ch12
          </Chain12>
        </Box>
        <Box>
          <Chain13 $mono $truncate>
            Ch13
          </Chain13>
        </Box>
        <Box>
          <Chain14 $align="left" $pad={6} $highlight>
            Ch14
          </Chain14>
        </Box>
        <Box>
          <Chain15 $danger={false} $outline={false} $sm $rounded>
            Ch15
          </Chain15>
        </Box>
        <Box>
          <Chain16 $card $hover>
            Ch16
          </Chain16>
        </Box>
        <Box>
          <Chain17 $dimmed={false} $italic $size="sm">
            Ch17
          </Chain17>
        </Box>
        <Box>
          <Chain18 $outlined $filled={false} $icon={false} $block={false}>
            Ch18
          </Chain18>
        </Box>
        <Box>
          <Chain19 $variant="solid" $upper>
            Ch19
          </Chain19>
        </Box>
        <Box>
          <Chain20 $dense={false} $serif={false} $size="md" $maxWidth={200}>
            Ch20
          </Chain20>
        </Box>
      </Grid>

      <SectionTitle>Attrs Chains (Attrs01–Attrs15)</SectionTitle>
      <Grid>
        <Box>
          <Attrs01>Attrs01</Attrs01>
        </Box>
        <Box>
          <Attrs02 placeholder="Attrs02" />
        </Box>
        <Box>
          <Attrs03 $level={1}>Attrs03</Attrs03>
        </Box>
        <Box>
          <Attrs04 $variant="primary">Attrs04</Attrs04>
        </Box>
        <Box>
          <Attrs05 href="#attrs05">Attrs05</Attrs05>
        </Box>
        <Box>
          <Attrs06 $required placeholder="Attrs06" />
        </Box>
        <Box>
          <Attrs07 $label="region">Attrs07</Attrs07>
        </Box>
        <Box>
          <Attrs08>Attrs08</Attrs08>
        </Box>
        <Box>
          <Attrs09 $type="success">Attrs09</Attrs09>
        </Box>
        <Box>
          <Attrs10
            $alt="test"
            src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
          />
        </Box>
        <Box>
          <Attrs11>Attrs11</Attrs11>
        </Box>
        <Box>
          <Attrs12 $role="group">Attrs12</Attrs12>
        </Box>
        <Box>
          <Attrs13>
            <option>Attrs13</option>
          </Attrs13>
        </Box>
        <Box>
          <Attrs14 $variant="feature">Attrs14</Attrs14>
        </Box>
        <Box>
          <Attrs15 placeholder="Attrs15" />
        </Box>
      </Grid>

      <SectionTitle>Polymorphic (Poly01–Poly10)</SectionTitle>
      <Grid>
        <Box>
          <Poly01>Poly01</Poly01>
        </Box>
        <Box>
          <Poly02>Poly02</Poly02>
        </Box>
        <Box>
          <Poly03>Poly03</Poly03>
        </Box>
        <Box>
          <Poly04>Poly04</Poly04>
        </Box>
        <Box>
          <Poly05>Poly05</Poly05>
        </Box>
        <Box>
          <Poly06>Poly06</Poly06>
        </Box>
        <Box>
          <Poly07>Poly07</Poly07>
        </Box>
        <Box>
          <Poly08>Poly08</Poly08>
        </Box>
        <Box>
          <Poly09>Poly09</Poly09>
        </Box>
        <Box>
          <Poly10>Poly10</Poly10>
        </Box>
      </Grid>

      <SectionTitle>Spread Props (Spread01–Spread10)</SectionTitle>
      <Grid>
        <Box>
          <Spread01>Spread01</Spread01>
        </Box>
        <Box>
          <Spread02>Spread02</Spread02>
        </Box>
        <Box>
          <Spread03>Spread03</Spread03>
        </Box>
        <Box>
          <Spread04 label="Spread04" />
        </Box>
        <Box>
          <Spread05>Spread05</Spread05>
        </Box>
        <Box>
          <Spread06>Spread06</Spread06>
        </Box>
        <Box>
          <Spread07>Spread07</Spread07>
        </Box>
        <Box>
          <Spread08>Spread08</Spread08>
        </Box>
        <Box>
          <Spread09>Spread09</Spread09>
        </Box>
        <Box>
          <Spread10>Spread10</Spread10>
        </Box>
      </Grid>

      <SectionTitle>Generic Wrappers (Generic01–Generic05)</SectionTitle>
      <Grid>
        <Box>
          <Generic01 item={{ id: 'g01', name: 'Widget' }} />
        </Box>
        <Box>
          <Generic02 item={{ id: 'g02', label: 'Count', value: 42 }} />
        </Box>
        <Box>
          <Generic03 item={{ id: 'g03', title: 'Task', status: 'open' }} highlight />
        </Box>
        <Box>
          <Generic04 item={{ id: 'g04', tags: ['a', 'b', 'c'] }} />
        </Box>
        <Box>
          <Generic05 item={{ id: 'g05', meta: { env: 'prod', v: 2 } }} />
        </Box>
      </Grid>
    </div>
  );
}
