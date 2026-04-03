'use client';

import { useCallback, useState } from 'react';
import styled, { css } from 'styled-components';
import { generateListItems, type ListItemData } from '../lib/data-generators';
import { TimerDisplay } from '../lib/timer-display';
import { useAutoRun, useRenderTimer } from '../lib/use-render-timer';

const ITEM_COUNT = 50;

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface ItemRowProps {
  item: ListItemData;
  onStarToggle: (id: string) => void;
}

function ItemRow({ item, onStarToggle }: ItemRowProps) {
  return (
    <Row $unread={!item.isRead}>
      <UnreadDot $visible={!item.isRead} />
      <Avatar>{getInitials(item.sender)}</Avatar>
      <Content>
        <TopLine>
          <Sender $unread={!item.isRead}>{item.sender}</Sender>
          <Timestamp>{formatTimestamp(item.timestamp)}</Timestamp>
        </TopLine>
        <Subject $unread={!item.isRead}>{item.title}</Subject>
        <Preview>{item.preview}</Preview>
      </Content>
      <Actions>
        <PriorityBadge $priority={item.priority}>{item.priority}</PriorityBadge>
        <StarButton
          $active={item.isStarred}
          onClick={e => {
            e.stopPropagation();
            onStarToggle(item.id);
          }}
          aria-label={item.isStarred ? 'Unstar' : 'Star'}
        >
          {item.isStarred ? '★' : '☆'}
        </StarButton>
      </Actions>
    </Row>
  );
}

const initialItems = generateListItems(ITEM_COUNT, 42);

export default function ListPage() {
  const [items, setItems] = useState(initialItems);
  const { timings, markStart, clear } = useRenderTimer();

  const shuffle = useCallback(() => {
    markStart('Shuffle (unmount/remount)');
    setItems(generateListItems(ITEM_COUNT));
  }, [markStart]);

  const { autoRun, start, stop } = useAutoRun(shuffle, 50);

  const toggleRead = useCallback(() => {
    markStart('Toggle Read (all items)');
    setItems(prev => prev.map(item => ({ ...item, isRead: !item.isRead })));
  }, [markStart]);

  const toggleStar = useCallback((id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isStarred: !item.isStarred } : item))
    );
  }, []);

  return (
    <Page>
      <Header>
        <PageTitle>Inbox</PageTitle>
        <Controls>
          <ActionButton onClick={shuffle}>Shuffle</ActionButton>
          <ActionButton onClick={toggleRead}>Toggle Read</ActionButton>
        </Controls>
      </Header>
      <TimerDisplay
        timings={timings}
        onClear={clear}
        autoRun={autoRun}
        onAutoStart={start}
        onAutoStop={stop}
      />
      <ListContainer>
        {items.map(item => (
          <ItemRow key={item.id} item={item} onStarToggle={toggleStar} />
        ))}
      </ListContainer>
    </Page>
  );
}

const Page = styled.div`
  max-width: 900px;
  margin: 0 auto;
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${p => p.theme.spacing.medium};
`;

const PageTitle = styled.h1`
  font-size: ${p => p.theme.typography.fontSize.large};
  color: ${p => p.theme.colors.text};
  margin: 0;
  font-weight: 700;
`;

const Controls = styled.div`
  display: flex;
  gap: ${p => p.theme.spacing.small};
`;

const ActionButton = styled.button`
  background: ${p => p.theme.colors.primary};
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: ${p => p.theme.typography.fontSize.small};
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }

  &:active {
    opacity: 0.7;
  }
`;

const ListContainer = styled.div`
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
  background: ${p => p.theme.colors.surface};
`;

const Row = styled.div<{ $unread: boolean }>`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.medium};
  padding: 14px 16px;
  border-bottom: 1px solid ${p => p.theme.colors.border};
  cursor: pointer;
  transition: background 0.1s;
  background: ${p => (p.$unread ? p.theme.colors.background : p.theme.colors.surface)};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${p => p.theme.colors.border};
  }
`;

const UnreadDot = styled.div<{ $visible: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => (p.$visible ? p.theme.colors.primary : 'transparent')};
  transition: background 0.15s;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: ${p => p.theme.colors.secondary};
  user-select: none;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const TopLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
`;

const Sender = styled.span<{ $unread: boolean }>`
  font-size: ${p => p.theme.typography.fontSize.small};
  font-weight: ${p => (p.$unread ? '700' : '500')};
  color: ${p => (p.$unread ? p.theme.colors.text : p.theme.colors.textMuted)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Timestamp = styled.span`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
  white-space: nowrap;
  flex-shrink: 0;
`;

const Subject = styled.div<{ $unread: boolean }>`
  font-size: ${p => p.theme.typography.fontSize.medium};
  font-weight: ${p => (p.$unread ? '600' : '400')};
  color: ${p => (p.$unread ? p.theme.colors.text : p.theme.colors.textMuted)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
`;

const Preview = styled.div`
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const priorityStyles = css<{ $priority: 'low' | 'medium' | 'high' }>`
  ${p =>
    p.$priority === 'high'
      ? `background: ${p.theme.colors.danger}22; color: ${p.theme.colors.danger};`
      : p.$priority === 'medium'
      ? `background: ${p.theme.colors.warning}22; color: ${p.theme.colors.warning};`
      : `background: ${p.theme.colors.success}22; color: ${p.theme.colors.success};`}
`;

const PriorityBadge = styled.span<{ $priority: 'low' | 'medium' | 'high' }>`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  ${priorityStyles}
`;

const StarButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: ${p => (p.$active ? p.theme.colors.warning : p.theme.colors.border)};
  transition: color 0.15s, transform 0.1s;

  &:hover {
    color: ${p => p.theme.colors.warning};
    transform: scale(1.2);
  }
`;
