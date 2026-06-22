export type PlayerId = 'A'|'B';
export type CellId = 1|2|3|4|5|6|7|8|9;
export type Color = 'W'|'B'|'BW_R'|'BW_L';
export type Card = 'I'|'X'|'Y'|'Z'|'H';
export type Phase = 'mulligan'|'ops'|'measure'|'score'|'ended';

export type Cell = { id: CellId; color: Color };

export type MeasurementEvent = {
  cell: CellId;
  from: Color;
  to: Color;
  die?: 'd8';
  roll?: number;
  changed: boolean;
};

export type MeasurementPayload = {
  before: Record<CellId, Cell>;
  sequence: MeasurementEvent[];
  after: Record<CellId, Cell>;
};

export type ClientPublicState = {
  phase: Phase;
  turnIndex: number;
  active: PlayerId;
  grid: Record<CellId, Cell>;
  discard: Card[];
  playsThisTurn: number;
  config: { mode: 'semplificata'; rngSeed: string; totalRounds?: number; };
  measurement?: MeasurementPayload;
  winner?: PlayerId|'draw';
  handCount: { A: number; B: number };
};

export type WsServerMsg =
  | { type: 'created', roomId: string, you: PlayerId }
  | { type: 'joined', roomId: string, you: PlayerId }
  | { type: 'state', state: ClientPublicState, yourHand: Card[] }
  | { type: 'error', message: string }
  | { type: 'roomClosed', reason: 'opponent_left' | 'empty' };

export type WsClientMsg =
  | { type: 'create', mode: 'semplificata', totalRounds?: number, name?: string }
  | { type: 'join', roomId: string, name?: string }
  | { type: 'play', payload: { card: Card, target: CellId|null } }
  | { type: 'endTurn' }
  | { type: 'finishMeasure' }
  | { type: 'requestState' }
  | { type: 'mulligan', indices: number[] }
  | { type: 'abandon' };
