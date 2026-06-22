import type { Card, CellId, Color, PlayerId, MeasurementEvent, MeasurementPayload } from '../types';
import { RNG } from '../rng';

type CardT = Card;
type PlayerIdT = PlayerId;
type CellIdT = CellId;
type ColorT = Color;

function buildDeck(): CardT[] {
  const counts: Record<CardT, number> = { I:6, X:12, Y:6, Z:14, H:18 };
  const deck: CardT[] = [];
  (Object.keys(counts) as CardT[]).forEach(k => { for (let i=0; i<counts[k]; i++) deck.push(k); });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function randomInitialCell(rng: RNG, id: CellIdT): any {
  const r = rng.roll(4);
  const color: ColorT = (r===1) ? 'W' : (r===2) ? 'B' : (r===3) ? 'BW_R' : 'BW_L';
  return { id, color };
}

function cloneGrid(g:any) { const out:any = {}; Object.keys(g).forEach(k=> out[k] = { id: g[k].id, color: g[k].color }); return out; }

function computeMeasurement(state:any, rng:RNG): MeasurementPayload {
  const before = cloneGrid(state.grid);
  const seq: MeasurementEvent[] = [];
  const after = cloneGrid(state.grid);
  (Object.keys(before) as unknown as CellIdT[]).forEach((cid)=>{
    const c = before[cid];
    if (c.color==='BW_R' || c.color==='BW_L') {
      const d8 = rng.roll(8);
      const to: ColorT = (d8<=4) ? 'W' : 'B';
      seq.push({ cell: cid, from: c.color, to, die:'d8', roll:d8, changed: true });
      after[cid] = { ...c, color: to };
    } else {
      seq.push({ cell: cid, from: c.color, to: c.color, changed: false });
    }
  });
  return { before, sequence: seq, after };
}

function createLocalGame(seed: any, totalRounds:number) {
  const rng = new RNG(seed);
  const grid: any = {1:null,2:null,3:null,4:null,5:null,6:null,7:null,8:null,9:null};
  (Object.keys(grid) as unknown as CellIdT[]).forEach(cid => { grid[cid] = randomInitialCell(rng, cid); });
  const deck = buildDeck();
  const hands: { A: CardT[]; B: CardT[] } = { A: [] as CardT[], B: [] as CardT[] };
  for (let i=0; i<6; i++) { hands.A.push(deck.pop()!); hands.B.push(deck.pop()!); }
  return {
    phase: 'mulligan' as const,
    turnIndex: 1,
    active: 'A' as const,
    grid, deck, hands, discard: [] as CardT[], playsThisTurn: 0,
    config: { mode: 'semplificata' as const, rngSeed: String(seed), totalRounds },
    measurement: undefined as undefined | MeasurementPayload,
    winner: undefined as any,
    _mulligan: { A:false, B:false }
  };
}

function applyCardToCell(card: CardT, cell: any): any {
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

function draw(state:any, pid:PlayerIdT, n:number) {
  for (let i=0; i<n; i++) {
    if (state.deck.length === 0) break;
    state.hands[pid].push(state.deck.pop()!);
  }
}

export class LocalEngine {
  state: any;
  target: CellIdT|null = null;
  rng: RNG;
  constructor(rounds:number) {
    const s: any = 'local-seed';
    this.rng = new RNG(s);
    this.reset(rounds);
  }
  reset(rounds:number) { this.state = createLocalGame('local-seed', rounds); }
  mulligan(indices: number[]) {
    if (this.state.phase !== 'mulligan') return;
    const hand = this.state.hands[this.state.active];
    const uniqueSorted = [...new Set(indices)].sort((a,b)=>b-a);
    const discarded: CardT[] = [];
    for (const idx of uniqueSorted) {
      if (idx>=0 && idx<hand.length) {
        const [c] = hand.splice(idx,1);
        if (c) discarded.push(c);
      }
    }
    draw(this.state, this.state.active, discarded.length);
    this.state.discard.push(...discarded);
    this.state._mulligan[this.state.active] = true;
    if (this.state._mulligan.A && this.state._mulligan.B) {
      this.state.phase = 'ops';
      this.state.turnIndex = 1;
      this.state.active = 'A';
      draw(this.state, 'A', 2);
    } else {
      this.state.active = (this.state.active==='A') ? 'B' : 'A';
      this.target = null;
    }
  }
  play(card: CardT) {
    const t = (card==='I') ? null : this.target;
    if (this.state.phase!=='ops') return;
    const pid: PlayerIdT = this.state.active;
    const hand = this.state.hands[pid];
    const idx = hand.indexOf(card);
    if (idx===-1) return;
    if (this.state.playsThisTurn>=2) return;
    hand.splice(idx,1);
    this.state.discard.push(card);
    if (card!=='I' && t) {
      this.state.grid[t] = applyCardToCell(card, this.state.grid[t]);
    }
    this.state.playsThisTurn += 1;
  }
  endTurn() {
    if (this.state.phase!=='ops') return;
    if (this.state.playsThisTurn < 2) { alert('You must play exactly 2 cards'); return; }
    if (this.state.turnIndex>=this.state.config.totalRounds && this.state.active==='B') {
      this.state.phase='measure';
      this.state.measurement = computeMeasurement(this.state, this.rng);
      return;
    }
    if (this.state.active==='A') {
      this.state.active='B';
      draw(this.state,'B',2);
    } else {
      this.state.active='A';
      this.state.turnIndex += 1;
      draw(this.state,'A',2);
    }
    this.state.playsThisTurn=0;
  }
  finishMeasure() {
    if (this.state.measurement) {
      this.state.grid = this.state.measurement.after;
    }
    const LINES = [[1,2,3],[4,5,6],[7,8,9],[1,4,7],[2,5,8],[3,6,9],[1,5,9],[3,5,7]];
    let A=0,B=0;
    for (const line of LINES) {
      const colors = line.map((i:number)=>this.state.grid[i].color);
      if (colors.every((c:any)=>c==='W')) A++;
      if (colors.every((c:any)=>c==='B')) B++;
    }
    this.state.winner = (A>B)?'A':(B>A)?'B':'draw';
    this.state.phase = 'ended';
  }
}
