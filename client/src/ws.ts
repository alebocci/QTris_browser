import type { WsClientMsg, WsServerMsg } from './types';

const WS_URL = (import.meta as any).env?.VITE_SERVER_WS
  || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:8081`;

export class QtrisWS {
  ws: WebSocket | null = null;
  listeners: ((msg: WsServerMsg)=>void)[] = [];
  connect() {
    this.ws = new WebSocket(WS_URL);
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as WsServerMsg;
      this.listeners.forEach(l => l(msg));
    };
  }
  send(msg: WsClientMsg) {
    this.ws?.send(JSON.stringify(msg));
  }
  onMessage(cb: (msg: WsServerMsg)=>void) {
    this.listeners.push(cb);
  }
}
