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
          <input placeholder="discard indices (e.g. 0,2,3)" value={mull} onChange={e=>setMull(e.target.value)} />
          <button disabled={sent} onClick={()=>{
            const indices = mull.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
            onMulligan(indices);
            setSent(true);
          }}>Mulligan</button>
          <button disabled={sent} onClick={()=>{ onMulligan([]); setSent(true); }}>No discard</button>
          <span className="note">Enter the 0-based indices of the cards to discard.</span>
          {sent && <div style={{marginLeft:8}}>Mulligan sent - waiting for the other player...</div>}
          <details style={{marginTop:8}}>
            <summary>How the Mulligan works</summary>
            <div style={{marginTop:6, fontSize:13, lineHeight:1.4}}>
              <ul style={{margin:'6px 0 0 18px'}}>
                <li>You start with <b>6 cards</b>.</li>
                <li>Type the <b>indices (0-5)</b> of the cards to discard, separated by commas (for example <code>0,2,5</code>).</li>
                <li>Press <b>Mulligan</b> to discard and draw the same number of cards.</li>
                <li>If you do not want to discard anything, press <b>No discard</b>.</li>
                <li>The game starts when <b>both players</b> have confirmed the Mulligan.</li>
              </ul>
              <div style={{marginTop:6, opacity:.8}}>Tip: in local mode, control passes to Black after White's Mulligan.</div>
            </div>
          </details>
        </div>
      ) : (
        <div className="ops">
          <div>Moves played: {plays} / 2</div>
          <button onClick={onEnd} disabled={!allowEnd}>End turn</button>
          {needTwo && plays<2 && <span className="note"> You must play exactly two cards.</span>}
        </div>
      )}
    </div>
  );
}
