export type PlayerId = 'A' | 'B';
export type CellId = 1|2|3|4|5|6|7|8|9;
export type Color = 'W'|'B'|'BW_R'|'BW_L';
export type Card = 'I'|'X'|'Y'|'Z'|'H';
export type Phase = 'mulligan'|'ops'|'measure'|'score'|'ended';

export type Cell = { id: CellId; color: Color };

export type GameConfig = {
  mode: 'semplificata';
  rngSeed: string;
  totalRounds?: number;
};

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

export type GameState = {
  phase: Phase;
  turnIndex: number;
  active: PlayerId;
  grid: Record<CellId, Cell>;
  deck: Card[];
  hands: { A: Card[]; B: Card[] };
  discard: Card[];
  playsThisTurn: number;
  config: GameConfig;
  measurement?: MeasurementPayload;
  winner?: PlayerId | 'draw';
};

export type ClientPublicState = Omit<GameState, 'deck'|'hands'> & {
  handCount: { A: number; B: number };
};

export type PlayCardPayload = {
  card: Card;
  target: CellId | null;
};

export type WsClientMsg =
  | { type: 'create', mode: 'semplificata', totalRounds?: number, name?: string }
  | { type: 'join', roomId: string, name?: string }
  | { type: 'play', payload: PlayCardPayload }
  | { type: 'endTurn' }
  | { type: 'finishMeasure' }
  | { type: 'requestState' }
  | { type: 'mulligan', indices: number[] }
  | { type: 'abandon' };

export type WsServerMsg =
  | { type: 'created', roomId: string, you: PlayerId }
  | { type: 'joined', roomId: string, you: PlayerId }
  | { type: 'state', state: ClientPublicState, yourHand: Card[] }
  | { type: 'error', message: string }
  | { type: 'roomClosed', reason: 'opponent_left' | 'empty' };
