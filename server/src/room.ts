import { WebSocket } from 'ws';
import { RNG } from './rng.js';
import { createGame, doMulligan, endTurn, measure, playCard, score, startOpsAfterMulligan, toPublicState } from './game.js';
import { ClientPublicState, GameConfig, PlayerId, WsClientMsg, WsServerMsg } from './types.js';

type Client = {
  ws: WebSocket;
  pid: PlayerId;
  name?: string;
};

export class Room {
  id: string;
  config: GameConfig;
  rng: RNG;
  state = createGame({ mode: 'semplificata', rngSeed: '', totalRounds: 5 });
  clients: Partial<Record<PlayerId, Client>> = {};
  mulliganDone: Record<PlayerId, boolean> = { A: false, B: false };

  constructor(id: string, config: GameConfig) {
    this.id = id;
    this.config = config;
    this.rng = new RNG(config.rngSeed);
    this.state = createGame(config);
  }

  addClient(ws: WebSocket, pid: PlayerId, name?: string) {
    this.clients[pid] = { ws, pid, name };
    this.sendStateTo(pid);
  }

  broadcast(msg: WsServerMsg) {
    for (const c of Object.values(this.clients)) {
      if (c) c.ws.send(JSON.stringify(msg));
    }
  }
  sendTo(pid: PlayerId, msg: WsServerMsg) {
    const c = this.clients[pid];
    if (c) c.ws.send(JSON.stringify(msg));
  }
  sendStateTo(pid: PlayerId) {
    const state: ClientPublicState = toPublicState(this.state, pid);
    const yourHand = this.state.hands[pid];
    this.sendTo(pid, { type: 'state', state, yourHand });
  }
  sendStateAll() {
    if (this.clients.A) this.sendStateTo('A');
    if (this.clients.B) this.sendStateTo('B');
  }

  handle(pid: PlayerId, raw: WsClientMsg) {
    switch (raw.type) {
      case 'mulligan': {
        const { indices } = raw;
        if (this.state.phase !== 'mulligan') break;
        doMulligan(this.state, pid, indices);
        this.mulliganDone[pid] = true;
        if (this.mulliganDone.A && this.mulliganDone.B) {
          startOpsAfterMulligan(this.state);
        } else {
          this.state.active = this.state.active === 'A' ? 'B' : 'A';
        }
        this.sendStateAll();
        break;
      }
      case 'play': {
        const { card, target } = raw.payload;
        const err = playCard(this.state, pid, card, target);
        if (err) this.sendTo(pid, { type: 'error', message: err });
        this.sendStateAll();
        break;
      }
      case 'endTurn': {
        const err = endTurn(this.state, pid);
        if (err) { this.sendTo(pid, { type: 'error', message: err }); this.sendStateTo(pid); break; }
        if (this.state.phase === 'measure') {
          measure(this.state, this.rng);
          this.sendStateAll();
        } else {
          this.sendStateAll();
        }
        break;
      }
      case 'finishMeasure': {
        if (this.state.phase === 'measure') {
          if (this.state.measurement) {
            this.state.grid = this.state.measurement.after as any;
          }
          score(this.state);
          this.sendStateAll();
        }
        break;
      }
      case 'requestState': {
        this.sendStateTo(pid);
        break;
      }
    }
  }
}
