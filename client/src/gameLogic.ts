import type { Card, Color } from './types';

export function colorEmoji(c: Color) {
  switch (c) {
    case 'W': return '⚪';
    case 'B': return '⚫';
    case 'BW_R': return '◐';
    case 'BW_L': return '◑';
  }
}
export function cardLabel(c: Card) { return c; }
export function canTarget(card: Card) { return card !== 'I'; }
