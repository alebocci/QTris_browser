import React, { useEffect, useState } from 'react';
import { QtrisWS } from '../ws';
import type { Card, CellId, ClientPublicState, MeasurementPayload, PlayerId, WsServerMsg } from '../types';
import Board from '../components/Board';
import Hand from '../components/Hand';
import Controls from '../components/Controls';
import MeasureOverlay from '../components/MeasureOverlay';
import ErrorBoundary from '../components/ErrorBoundary';
import Toasts, { ToastItem } from '../components/Toast';
import { LocalEngine } from './localEngine';

type View = 'menu'|'local'|'online';

function pidLabel(p:'A'|'B'){ return p==='A' ? 'White' : 'Black'; }
function pidEmoji(p:'A'|'B'){ return p==='A' ? '⚪' : '⚫'; }
function phaseLabel(phase?: string) {
  switch (phase) {
    case 'mulligan': return 'Mulligan';
    case 'ops': return 'Operations';
    case 'measure': return 'Measurement';
    case 'score': return 'Scoring';
    case 'ended': return 'Ended';
    default: return phase ?? '-';
  }
}
function winnerLabel(winner?: PlayerId|'draw') {
  if (!winner) return '-';
  if (winner === 'draw') return 'Draw';
  return `${pidLabel(winner)} ${pidEmoji(winner)}`;
}

export default function App() {
  const [view, setView] = useState<View>('menu');
  const [rounds, setRounds] = useState<number>(5);

  return (
    <div className="container">
      {view==='menu' && <Menu rounds={rounds} setRounds={setRounds} onLocal={()=>setView('local')} onOnline={()=>setView('online')} />}
      {view==='local' && <LocalGame rounds={rounds} onBack={()=>setView('menu')} />}
      {view==='online' && <OnlineGame rounds={rounds} onBack={()=>setView('menu')} onExitToMenu={()=>setView('menu')} />}
    </div>
  );
}

function Menu({onLocal, onOnline, rounds, setRounds}:{onLocal:()=>void; onOnline:()=>void; rounds:number; setRounds:(n:number)=>void}) {
  return (
    <div className="menu">
      <h1>QTris - Simplified Mode</h1>
      <p>Play locally with pass-and-play or online 1v1.</p>
      <div className="settings">
        <label>Number of rounds (A+B): <input type="number" min={1} max={20} value={rounds} onChange={e=>setRounds(Math.max(1, Math.min(20, parseInt(e.target.value||'5',10))))} /></label>
        <div className="hint">Base rules: 5 rounds (10 total turns, 5 per player).</div>
      </div>
      <div className="menu-buttons">
        <button onClick={onLocal}>Local game</button>
        <button onClick={onOnline}>Online game</button>
      </div>
    </div>
  );
}

function LocalGame({onBack, rounds}:{onBack:()=>void; rounds:number}) {
  const [eng, setEng] = useState(()=>new LocalEngine(rounds));
  const [, force] = useState(0);
  const [highlight, setHighlight] = useState<CellId|null>(null);
  const rerender = () => force(x=>x+1);

  useEffect(()=>{ setEng(new LocalEngine(rounds)); }, [rounds]);

  const measurement: MeasurementPayload|undefined = eng.state.measurement;

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = (text:string)=> setToasts(ts=>[...ts, {id: Date.now()+Math.random(), text}]);
  const prev = React.useRef<any>(null);
  useEffect(()=>{
    const prevState = prev.current;
    const cur = eng.state;
    if (prevState){
      if (prevState.phase !== cur.phase){
        if (cur.phase==='ops') addToast('Operations phase - '+pidLabel(cur.active)+' '+pidEmoji(cur.active)+' to move');
        if (cur.phase==='measure') addToast('Measurement phase: apply results one cell at a time');
        if (cur.phase==='ended') addToast('Game over');
      } else if (prevState.active !== cur.active && cur.phase==='ops'){
        addToast(pidLabel(cur.active)+' '+pidEmoji(cur.active)+' to move');
      }
    } else {
      addToast('Initial Mulligan: confirm to start');
    }
    prev.current = JSON.parse(JSON.stringify(cur));
  }, [eng.state]);

  return (
    <ErrorBoundary>
      <div className="game">
        <div className="topbar">
          <button onClick={onBack}>← Menu</button>
          <h2>Local (pass-and-play)</h2>
        </div>
        <div className="hud">
          <div>Phase: {phaseLabel(eng.state.phase)}</div>
          <div>Round: {eng.state.turnIndex}/{eng.state.config.totalRounds ?? 5} • Active: <span className='badge'><span className='dot'>{pidEmoji(eng.state.active)}</span> <strong>{pidLabel(eng.state.active)}</strong></span></div>
          <div>Hands: <span className='badge'><span className='dot'>⚪</span>White {eng.state.hands.A.length}</span> | <span className='badge'><span className='dot'>⚫</span>Black {eng.state.hands.B.length}</span></div>
        </div>
        <div className="board-hand">
          <Board grid={eng.state.grid} selected={eng.target} highlight={highlight} onSelect={(c)=>{ eng.target=c; rerender(); }} />
          <Hand hand={eng.state.hands[eng.state.active]} onPlay={(card)=>{ 
            const needsTarget = card!=='I';
            if (eng.state.phase!=='ops') { alert('You are not in the Operations phase'); return; }
            if (needsTarget && !eng.target) { alert('Select a cell first'); return; }
            eng.play(card); rerender();
          }} />
        </div>
        <Controls
          key={`mull-${eng.state.phase}-${eng.state.active}`}
          phase={eng.state.phase}
          plays={eng.state.playsThisTurn}
          onEnd={()=>{ eng.endTurn(); rerender(); }}
          onMulligan={(indices)=>{ eng.mulligan(indices); rerender(); }}
          canEnd={true}
        />
        {eng.state.phase==='measure' && measurement && (
          <MeasureOverlay measurement={measurement} onDone={()=>{ eng.finishMeasure(); rerender(); }} onHighlight={setHighlight} />
        )}
        {eng.state.phase==='ended' && (
          <div className="result">
            <h3>Result</h3>
            <div>Winner: {winnerLabel(eng.state.winner)}</div>
            <button onClick={()=>{ setEng(new LocalEngine(rounds)); rerender(); }}>New game</button>
          </div>
        )}
      </div>
    <Toasts items={toasts} onClose={(id)=>setToasts(ts=>ts.filter(t=>t.id!==id))} />
    <Toasts items={toasts} onClose={(id)=>setToasts(ts=>ts.filter(t=>t.id!==id))} />
    </ErrorBoundary>
  );
}

function OnlineGame({onBack, rounds, onExitToMenu}:{onBack:()=>void; rounds:number; onExitToMenu:()=>void}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const addToast = (text:string)=> setToasts(ts=>[...ts, {id: Date.now()+Math.random(), text}]);
  const prev = React.useRef<ClientPublicState|null>(null);

  const [ws] = useState(()=>new QtrisWS());
  const [roomId, setRoomId] = useState<string>('');
  const [you, setYou] = useState<PlayerId>('A');
  const [state, setState] = useState<ClientPublicState|null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [target, setTarget] = useState<CellId|null>(null);
  const [highlight, setHighlight] = useState<CellId|null>(null);
  const [notice, setNotice] = useState<{title:string, body?:string}|null>(null);
  const [inSession, setInSession] = useState<boolean>(false);

  useEffect(()=>{
    ws.connect();

    const onLeave = () => { try { ws.send({type:'abandon'} as any); } catch {}; try { ws.ws?.close(4000, 'pagehide'); } catch {}; };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    ws.onMessage((msg: WsServerMsg)=>{
      if (msg.type==='created') { setRoomId(msg.roomId); setYou(msg.you); setInSession(true); addToast('Room created • You are '+pidLabel(msg.you)+' '+pidEmoji(msg.you)); }
      if (msg.type==='joined')  { setRoomId(msg.roomId); setYou(msg.you); setInSession(true); addToast('Joined room • You are '+pidLabel(msg.you)+' '+pidEmoji(msg.you)); }
      if (msg.type==='state')   { setState(msg.state); setHand(msg.yourHand); const prevState = prev.current; const cur = msg.state; if (prevState){ if (prevState.phase !== cur.phase){ if (cur.phase==='ops') addToast('Operations phase - '+pidLabel(cur.active)+' '+pidEmoji(cur.active)+' to move'); if (cur.phase==='measure') addToast('Measurement phase: apply results one cell at a time'); if (cur.phase==='ended') addToast('Game over'); } else if (prevState.active !== cur.active && cur.phase==='ops'){ addToast(pidLabel(cur.active)+' '+pidEmoji(cur.active)+' to move'); } } prev.current = cur; }
      if (msg.type==='roomClosed') { setNotice({ title: 'Game closed', body: 'The opponent left the room.' }); try { ws.ws?.close(); } catch {}; setInSession(false); }
      if (msg.type==='error')   { alert(msg.message); }
    });

    return () => {
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, []);

  const canPlay = state && state.active===you && state.phase==='ops';
  const measurement = state?.measurement;

  return (
    <ErrorBoundary>
      <div className="game">
        <div className="topbar">
          <button onClick={onBack}>← Menu</button>
          <h2>Online (1v1)</h2>
        </div>

        <div className="net">
          {!inSession ? (
            <>
              <input value={roomId} onChange={e=>setRoomId(e.target.value)} placeholder="Room ID" />
              <button onClick={()=>{ if (!inSession) ws.send({type:'join', roomId}); }}>Join</button>
              <span style={{margin:'0 8px'}}>or</span>
              <button onClick={()=>{ if (!inSession) ws.send({type:'create', mode:'semplificata', totalRounds: rounds}); }}>Create room</button>
              <span className="note"> Round: {rounds}</span>
            </>
          ) : (
            <>
              <div>In room: <b>{roomId}</b></div>
              <button onClick={()=>{
                try { ws.send({type:'abandon'} as any); } catch {}
                try { ws.ws?.close(); } catch {}
                setInSession(false); setState(null); setHand([]); setRoomId('');
                setNotice({title:'You left the room', body:'You can create or join another one.'});
                onExitToMenu();
              }}>Leave</button>
            </>
          )}
        </div>

        <div className="hud">
          <div>Room: {roomId || '-'}</div>
          <div>You: <span className='badge'><span className='dot'>{pidEmoji(you)}</span> <strong>{pidLabel(you)}</strong></span></div>
          <div>Phase: {phaseLabel(state?.phase)}</div>
          <div>Round: {state?.turnIndex}/{state?.config.totalRounds ?? 5} • Active: {state && (<span className='badge'><span className='dot'>{pidEmoji(state.active)}</span> <strong>{pidLabel(state.active)}</strong></span>)}</div>
          <div>Hands: <span className='badge'><span className='dot'>⚪</span>White {state?.handCount.A}</span> | <span className='badge'><span className='dot'>⚫</span>Black {state?.handCount.B}</span></div>
        </div>

        {notice && (
          <div className="notice-banner">
            <div className="notice-card">
              <h3 className="notice-title">{notice.title}</h3>
              {notice.body && <div className="notice-body">{notice.body}</div>}
              <div className="notice-actions">
                <button onClick={()=>setNotice(null)}>Close</button>
                <button className="primary" onClick={()=>{ setNotice(null); onExitToMenu(); }}>Back to menu</button>
              </div>
            </div>
          </div>
        )}

        {state && (
          <>
            <div className="board-hand">
              <Board grid={state.grid} selected={target} highlight={highlight} onSelect={(c)=>setTarget(c)} />
              <Hand hand={hand} onPlay={(card)=>{
                const needsTarget = card!=='I';
                if (state?.phase!=='ops' || state?.active!==you) { alert('It is not your turn, or you are not in the Operations phase'); return; }
                if (needsTarget && !target) { alert('Select a grid cell first'); return; }
                ws.send({type:'play', payload:{ card, target: needsTarget ? target! : null }});
              }} />
            </div>
            <Controls phase={state.phase} plays={state.playsThisTurn}
              onEnd={()=>ws.send({type:'endTurn'})}
              onMulligan={(indices)=>ws.send({type:'mulligan', indices})}
              canEnd={!!canPlay}
            />
            {state.phase==='measure' && measurement && (
              <MeasureOverlay measurement={measurement} onDone={()=>ws.send({type:'finishMeasure'})} onHighlight={setHighlight} />
            )}
            {state.phase==='ended' && (
              <div className="result">
                <h3>Result</h3>
                <div>Winner: {winnerLabel(state.winner)}</div>
              </div>
            )}
          </>
        )}
      </div>
    <Toasts items={toasts} onClose={(id)=>setToasts(ts=>ts.filter(t=>t.id!==id))} />
    <Toasts items={toasts} onClose={(id)=>setToasts(ts=>ts.filter(t=>t.id!==id))} />
    </ErrorBoundary>
  );
}
