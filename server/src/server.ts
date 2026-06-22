import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { Room } from './room.js';
import { WsClientMsg, WsServerMsg, PlayerId } from './types.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8081;

const app = express();
app.use(cors());
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(PORT, () => {
  console.log(`[qtris] HTTP/WS server on :${PORT}`);
});

const wss = new WebSocketServer({ server });

type LobbyRoom = { room: Room; ready: number };
const rooms = new Map<string, LobbyRoom>();

type HeartWS = WebSocket & { isAlive?: boolean };
const clientIndex = new Map<WebSocket, { room?: LobbyRoom, pid?: PlayerId }>();

function closeRoomAndNotify(lr: LobbyRoom | null, pid: PlayerId | null) {
  try {
    if (lr && pid) {
      const other: PlayerId = pid === 'A' ? 'B' : 'A';
      const opp = lr.room.clients[other];
      if (opp && opp.ws && opp.ws.readyState === opp.ws.OPEN) {
        try {
          opp.ws.send(JSON.stringify({ type: 'roomClosed', reason: 'opponent_left' } as WsServerMsg));
          opp.ws.close(1000, 'opponent_left');
        } catch {}
      }
      lr.ready = Math.max(0, lr.ready - 1);
      const rid = lr.room.id;
      for (const [key, r] of rooms.entries()) {
        if (r.room.id === rid) { rooms.delete(key); break; }
      }
      lr.room.clients = {};
    }
  } catch {}
}

const interval = setInterval(() => {
  wss.clients.forEach((socket) => {
    const ws = socket as HeartWS;
    if (ws.isAlive === false) {
      const bind = clientIndex.get(ws);
      try { ws.terminate(); } catch {}
      closeRoomAndNotify(bind?.room ?? null, bind?.pid ?? null);
      clientIndex.delete(ws);
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 15000);
wss.on('close', () => clearInterval(interval));

function makeRoomId() { return Math.random().toString(36).slice(2,8); }
function defaultSeed() { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

wss.on('connection', (ws: HeartWS) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  clientIndex.set(ws, {});

  let currentRoom: LobbyRoom | null = null;
  let pid: PlayerId | null = null;

  ws.on('message', (data) => {
    let msg: WsClientMsg;
    try { msg = JSON.parse(data.toString()); }
    catch {
      ws.send(JSON.stringify({ type: 'error', message: 'bad json' } satisfies WsServerMsg));
      return;
    }

    if (msg.type === 'create') {
      const id = makeRoomId();
      const totalRounds = (msg.totalRounds && msg.totalRounds > 0) ? msg.totalRounds : 5;
      const room = new Room(id, { mode: 'semplificata', rngSeed: defaultSeed(), totalRounds });
      rooms.set(id, { room, ready: 0 });
      currentRoom = rooms.get(id)!;
      pid = 'A';
      currentRoom.room.addClient(ws, 'A');
      currentRoom.ready += 1;
      clientIndex.set(ws, { room: currentRoom, pid });
      ws.send(JSON.stringify({ type: 'created', roomId: id, you: 'A' } as WsServerMsg));
      return;
    }

    if (msg.type === 'join') {
      const lr = rooms.get(msg.roomId);
      if (!lr) { ws.send(JSON.stringify({ type: 'error', message: 'stanza non trovata' } as WsServerMsg)); return; }
      if (lr.ready >= 2) { ws.send(JSON.stringify({ type: 'error', message: 'stanza piena' } as WsServerMsg)); return; }
      currentRoom = lr;
      pid = 'B';
      lr.room.addClient(ws, 'B');
      lr.ready += 1;
      clientIndex.set(ws, { room: currentRoom, pid });
      ws.send(JSON.stringify({ type: 'joined', roomId: msg.roomId, you: 'B' } as WsServerMsg));
      return;
    }

    if (msg.type === 'abandon') {
      closeRoomAndNotify(currentRoom, pid);
      try { ws.close(1000, 'client_abandon'); } catch {}
      return;
    }

    if (!currentRoom || !pid) {
      ws.send(JSON.stringify({ type: 'error', message: 'crea o unisciti a una stanza prima' } as WsServerMsg));
      return;
    }

    currentRoom.room.handle(pid, msg);
  });

  ws.on('close', () => {
    try { clientIndex.delete(ws); } catch {}
    closeRoomAndNotify(currentRoom, pid);
  });
});
