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

function pidLabel(p:'A'|'B'){ return p==='A' ? 'Bianco' : 'Nero'; }
function pidEmoji(p:'A'|'B'){ return p==='A' ? '⚪' : '⚫'; }

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
      <h1>QTris – Modalità semplificata</h1>
      <p>Gioca in locale (pass-and-play) o online 1v1.</p>
      <div className="settings">
        <label>Numero di round (A+B): <input type="number" min={1} max={20} value={rounds} onChange={e=>setRounds(Math.max(1, Math.min(20, parseInt(e.target.value||'5',10))))} /></label>
        <div className="hint">Nel regolamento base: 5 round (10 turni totali: 5 a testa).</div>
      </div>
      <div className="menu-buttons">
        <button onClick={onLocal}>Gioca locale</button>
        <button onClick={onOnline}>Gioca online</button>
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
        if (cur.phase==='ops') addToast('Fase Operazioni — tocca a '+pidLabel(cur.active)+' '+pidEmoji(cur.active));
        if (cur.phase==='measure') addToast('Fase di Misura: applica gli esiti una casella alla volta');
        if (cur.phase==='ended') addToast('Partita conclusa');
      } else if (prevState.active !== cur.active && cur.phase==='ops'){
        addToast('Turno di '+pidLabel(cur.active)+' '+pidEmoji(cur.active));
      }
    } else {
      addToast('Mulligan iniziale: conferma per iniziare');
    }
    prev.current = JSON.parse(JSON.stringify(cur));
  }, [eng.state]);

  return (
    <ErrorBoundary>
      <div className="game">
        <div className="topbar">
          <button onClick={onBack}>← Menu</button>
          <h2>Locale (pass-and-play)</h2>
        </div>
        <div className="hud">
          <div>Fase: {eng.state.phase}</div>
          <div>Round: {eng.state.turnIndex}/{eng.state.config.totalRounds ?? 5} • Attivo: <span className='badge'><span className='dot'>{pidEmoji(eng.state.active)}</span> <strong>{pidLabel(eng.state.active)}</strong></span></div>
          <div>Mani: <span className='badge'><span className='dot'>⚪</span>Bianco {eng.state.hands.A.length}</span> | <span className='badge'><span className='dot'>⚫</span>Nero {eng.state.hands.B.length}</span></div>
        </div>
        <div className="board-hand">
          <Board grid={eng.state.grid} selected={eng.target} highlight={highlight} onSelect={(c)=>{ eng.target=c; rerender(); }} />
          <Hand hand={eng.state.hands[eng.state.active]} onPlay={(card)=>{ 
            const needsTarget = card!=='I';
            if (eng.state.phase!=='ops') { alert('Non sei in fase Operazioni'); return; }
            if (needsTarget && !eng.target) { alert('Seleziona prima una casella'); return; }
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
            <h3>Risultato</h3>
            <div>Vincitore: {eng.state.winner}</div>
            <button onClick={()=>{ setEng(new LocalEngine(rounds)); rerender(); }}>Nuova partita</button>
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
      if (msg.type==='created') { setRoomId(msg.roomId); setYou(msg.you); setInSession(true); addToast('Stanza creata • Sei '+pidLabel(msg.you)+' '+pidEmoji(msg.you)); }
      if (msg.type==='joined')  { setRoomId(msg.roomId); setYou(msg.you); setInSession(true); addToast('Ingresso nella stanza • Sei '+pidLabel(msg.you)+' '+pidEmoji(msg.you)); }
      if (msg.type==='state')   { setState(msg.state); setHand(msg.yourHand); const prevState = prev.current; const cur = msg.state; if (prevState){ if (prevState.phase !== cur.phase){ if (cur.phase==='ops') addToast('Fase Operazioni — tocca a '+pidLabel(cur.active)+' '+pidEmoji(cur.active)); if (cur.phase==='measure') addToast('Fase di Misura: applica gli esiti una casella alla volta'); if (cur.phase==='ended') addToast('Partita conclusa'); } else if (prevState.active !== cur.active && cur.phase==='ops'){ addToast('Turno di '+pidLabel(cur.active)+' '+pidEmoji(cur.active)); } } prev.current = cur; }
      if (msg.type==='roomClosed') { setNotice({ title: 'Partita chiusa', body: "L'avversario ha abbandonato la stanza." }); try { ws.ws?.close(); } catch {}; setInSession(false); }
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
              <button onClick={()=>{ if (!inSession) ws.send({type:'join', roomId}); }}>Unisciti</button>
              <span style={{margin:'0 8px'}}>oppure</span>
              <button onClick={()=>{ if (!inSession) ws.send({type:'create', mode:'semplificata', totalRounds: rounds}); }}>Crea stanza</button>
              <span className="note"> Round: {rounds}</span>
            </>
          ) : (
            <>
              <div>In stanza: <b>{roomId}</b></div>
              <button onClick={()=>{
                try { ws.send({type:'abandon'} as any); } catch {}
                try { ws.ws?.close(); } catch {}
                setInSession(false); setState(null); setHand([]); setRoomId('');
                setNotice({title:'Hai abbandonato la stanza', body:"Puoi crearne o unirti a un'altra."});
                onExitToMenu();
              }}>Abbandona</button>
            </>
          )}
        </div>

        <div className="hud">
          <div>Room: {roomId || '-'}</div>
          <div>Tu: <span className='badge'><span className='dot'>{pidEmoji(you)}</span> <strong>{pidLabel(you)}</strong></span></div>
          <div>Fase: {state?.phase}</div>
          <div>Round: {state?.turnIndex}/{state?.config.totalRounds ?? 5} • Attivo: {state && (<span className='badge'><span className='dot'>{pidEmoji(state.active)}</span> <strong>{pidLabel(state.active)}</strong></span>)}</div>
          <div>Mani: <span className='badge'><span className='dot'>⚪</span>Bianco {state?.handCount.A}</span> | <span className='badge'><span className='dot'>⚫</span>Nero {state?.handCount.B}</span></div>
        </div>

        {notice && (
          <div className="notice-banner">
            <div className="notice-card">
              <h3 className="notice-title">{notice.title}</h3>
              {notice.body && <div className="notice-body">{notice.body}</div>}
              <div className="notice-actions">
                <button onClick={()=>setNotice(null)}>Chiudi</button>
                <button className="primary" onClick={()=>{ setNotice(null); onExitToMenu(); }}>Torna al menu</button>
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
                if (state?.phase!=='ops' || state?.active!==you) { alert('Non è il tuo turno oppure non sei in fase Operazioni'); return; }
                if (needsTarget && !target) { alert('Seleziona prima una casella sulla griglia'); return; }
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
                <h3>Risultato</h3>
                <div>Vincitore: {state.winner}</div>
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
