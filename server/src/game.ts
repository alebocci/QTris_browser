import { Card, Cell, CellId, ClientPublicState, Color, GameConfig, GameState, MeasurementEvent, MeasurementPayload, PlayerId } from './types.js';
import { RNG } from './rng.js';

const BASE_DECK: Record<Card, number> = { I: 6, X: 12, Y: 6, Z: 14, H: 18 };

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  (Object.keys(BASE_DECK) as Card[]).forEach(k => {
    for (let i=0; i<BASE_DECK[k]; i++) deck.push(k);
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const CELLS: CellId[] = [1,2,3,4,5,6,7,8,9];

function randomInitialCell(rng: RNG, id: CellId): Cell {
  const r = rng.roll(4);
  const color: Color = (r===1) ? 'W' : (r===2) ? 'B' : (r===3) ? 'BW_R' : 'BW_L';
  return { id, color };
}

export function createGame(config: GameConfig): GameState {
  const rng = new RNG(config.rngSeed);
  const gridObj: Record<CellId, Cell> = { 1: null as any,2:null as any,3:null as any,4:null as any,5:null as any,6:null as any,7:null as any,8:null as any,9:null as any };
  CELLS.forEach(c => gridObj[c] = randomInitialCell(rng, c));

  const deck = buildDeck();
  const hands: { A: Card[]; B: Card[] } = { A: [] as Card[], B: [] as Card[] };
  for (let i=0; i<6; i++) { hands.A.push(deck.pop()!); hands.B.push(deck.pop()!); }

  const totalRounds = config.totalRounds ?? 5;

  return {
    phase: 'mulligan',
    turnIndex: 1,
    active: 'A',
    grid: gridObj,
    deck,
    hands,
    discard: [] as Card[],
    playsThisTurn: 0,
    config: { ...config, totalRounds },
  };
}

function drawCards(state: GameState, pid: PlayerId, n: number) {
  for (let i=0; i<n; i++) {
    if (state.deck.length === 0) break;
    state.hands[pid].push(state.deck.pop()!);
  }
}

export function toPublicState(state: GameState, _you: PlayerId): ClientPublicState {
  const { deck, hands, ...pub } = state;
  const handCount = { A: state.hands.A.length, B: state.hands.B.length };
  return { ...pub, handCount };
}

function applyCardToCell(card: Card, cell: Cell): Cell {
  switch (card) {
    case 'I': return cell;
    case 'X':
      if (cell.color === 'W') return { ...cell, color: 'B' };
      if (cell.color === 'B') return { ...cell, color: 'W' };
      return cell;
    case 'Z':
      if (cell.color === 'BW_R') return { ...cell, color: 'BW_L' };
      if (cell.color === 'BW_L') return { ...cell, color: 'BW_R' };
      return cell;
    case 'Y':
      if (cell.color === 'W') return { ...cell, color: 'B' };
      if (cell.color === 'B') return { ...cell, color: 'W' };
      if (cell.color === 'BW_R') return { ...cell, color: 'BW_L' };
      if (cell.color === 'BW_L') return { ...cell, color: 'BW_R' };
      return cell;
    case 'H':
      if (cell.color === 'W') return { ...cell, color: 'BW_R' };
      if (cell.color === 'B') return { ...cell, color: 'BW_L' };
      if (cell.color === 'BW_R') return { ...cell, color: 'W' };
      if (cell.color === 'BW_L') return { ...cell, color: 'B' };
      return cell;
  }
}

export function startOpsAfterMulligan(state: GameState) {
  state.phase = 'ops';
  state.turnIndex = 1;
  state.active = 'A';
  state.playsThisTurn = 0;
  drawCards(state, 'A', 2);
}

export function doMulligan(state: GameState, pid: PlayerId, indices: number[]) {
  if (state.phase !== 'mulligan') return;
  const hand = state.hands[pid];
  const uniqueSorted = [...new Set(indices)].sort((a,b)=>b-a);
  const discarded: Card[] = [];
  for (const idx of uniqueSorted) {
    if (idx>=0 && idx<hand.length) {
      const [c] = hand.splice(idx,1);
      if (c) discarded.push(c);
    }
  }
  drawCards(state, pid, discarded.length);
  state.discard.push(...discarded);
}

export function playCard(state: GameState, pid: PlayerId, card: Card, target: CellId | null): string | null {
  if (state.phase !== 'ops') return 'Invalid phase';
  if (state.active !== pid) return 'It is not your turn';
  const hand = state.hands[pid];
  const idx = hand.indexOf(card);
  if (idx === -1) return 'Card is not in your hand';
  if (state.playsThisTurn >= 2) return 'You have already played 2 cards';
  if (card !== 'I' && (target===null || !(target in state.grid))) return 'Missing target';

  hand.splice(idx, 1);
  state.discard.push(card);
  if (card!=='I') {
    const cell = state.grid[target as CellId];
    state.grid[target as CellId] = applyCardToCell(card, cell);
  }
  state.playsThisTurn += 1;
  return null;
}

export function endTurn(state: GameState, pid: PlayerId): string | null {
  if (state.phase !== 'ops') return 'Invalid phase';
  if (state.active !== pid) return 'It is not your turn';
  if (state.playsThisTurn < 2) return 'You must play exactly 2 cards';

  const totalRounds = state.config.totalRounds ?? 5;
  if (state.turnIndex >= totalRounds && state.active === 'B') {
    state.phase = 'measure';
    return null;
  }
  if (state.active === 'A') {
    state.active = 'B';
    drawCards(state, 'B', 2);
  } else {
    state.active = 'A';
    state.turnIndex += 1;
    drawCards(state, 'A', 2);
  }
  state.playsThisTurn = 0;
  return null;
}

function cloneGrid(g: Record<CellId, Cell>): Record<CellId, Cell> {
  const out: any = {};
  (Object.keys(g) as unknown as CellId[]).forEach(cid => {
    const c = g[cid];
    out[cid] = { id: c.id, color: c.color };
  });
  return out;
}

export function measure(state: GameState, rng: RNG): MeasurementPayload {
  const before = cloneGrid(state.grid);
  const seq: MeasurementEvent[] = [];
  const after = cloneGrid(state.grid);

  (Object.keys(before) as unknown as CellId[]).forEach(cid => {
    const c = before[cid];
    if (c.color === 'BW_R' || c.color === 'BW_L') {
      const d8 = rng.roll(8);
      const to: Color = (d8<=4) ? 'W' : 'B';
      seq.push({ cell: cid, from: c.color, to, die: 'd8', roll: d8, changed: true });
      after[cid] = { ...c, color: to };
    } else {
      seq.push({ cell: cid, from: c.color, to: c.color, changed: false });
    }
  });

  state.measurement = { before, sequence: seq, after };
  return state.measurement;
}

const LINES: CellId[][] = [
  [1,2,3],[4,5,6],[7,8,9],
  [1,4,7],[2,5,8],[3,6,9],
  [1,5,9],[3,5,7]
];
export function score(state: GameState): { A: number; B: number } {
  let A = 0, B = 0;
  for (const line of LINES) {
    const colors = line.map(i => state.grid[i].color);
    if (colors.every(c => c === 'W')) A += 1;
    if (colors.every(c => c === 'B')) B += 1;
  }
  if (A>B) state.winner = 'A';
  else if (B>A) state.winner = 'B';
  else state.winner = 'draw';
  state.phase = 'ended';
  return { A, B };
}
