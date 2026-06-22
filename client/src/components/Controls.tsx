import React, { useState, useEffect } from 'react';

export default function Controls({phase, plays, onEnd, onMulligan, canEnd}:{phase:string; plays:number; onEnd:()=>void; onMulligan:(indices:number[])=>void; canEnd:boolean;}) {
  const [mull, setMull] = useState<string>('');
  const [sent, setSent] = useState(false);
  const needTwo = phase==='ops';
  const allowEnd = canEnd && (!needTwo || plays>=2);

  useEffect(()=>{ setSent(false); setMull(''); }, [phase]);

  return (
    <div className="controls">
      {phase==='mulligan' ? (
        <div className="mulligan">
          <input placeholder="indici da scartare (es. 0,2,3)" value={mull} onChange={e=>setMull(e.target.value)} />
          <button disabled={sent} onClick={()=>{
            const indices = mull.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
            onMulligan(indices);
            setSent(true);
          }}>Mulligan</button>
          <button disabled={sent} onClick={()=>{ onMulligan([]); setSent(true); }}>Nessuno scarto</button>
          <span className="note">Specifica gli indici (0-based) delle carte da scartare.</span>
          {sent && <div style={{marginLeft:8}}>✅ Mulligan inviato — in attesa dell’altro giocatore…</div>}
          <details style={{marginTop:8}}>
            <summary>ⓘ Come funziona il Mulligan</summary>
            <div style={{marginTop:6, fontSize:13, lineHeight:1.4}}>
              <ul style={{margin:'6px 0 0 18px'}}>
                <li>Hai <b>6 carte iniziali</b>.</li>
                <li>Scrivi gli <b>indici (0–5)</b> delle carte da scartare, separati da virgole (es. <code>0,2,5</code>).</li>
                <li>Premi <b>Mulligan</b> per scartare e pescare lo stesso numero di carte.</li>
                <li>Se non vuoi scartare nulla, premi <b>Nessuno scarto</b>.</li>
                <li>La partita parte quando <b>entrambi</b> hanno confermato il Mulligan.</li>
              </ul>
              <div style={{marginTop:6, opacity:.8}}>Suggerimento: in locale, dopo il Mulligan di A il controllo passa a B.</div>
            </div>
          </details>
        </div>
      ) : (
        <div className="ops">
          <div>Mosse giocate: {plays} / 2</div>
          <button onClick={onEnd} disabled={!allowEnd}>Fine turno</button>
          {needTwo && plays<2 && <span className="note"> Devi giocare esattamente due carte.</span>}
        </div>
      )}
    </div>
  );
}
