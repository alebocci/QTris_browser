import React, { useEffect, useMemo, useState } from 'react';
import type { MeasurementPayload, CellId, Cell } from '../types';
import Board from './Board';

function applyStep(grid: Record<CellId, Cell>, ev: MeasurementPayload['sequence'][number]): Record<CellId, Cell> {
  const next = { ...grid };
  const c = next[ev.cell];
  next[ev.cell] = { ...c, color: ev.to };
  return next;
}

export default function MeasureOverlay({measurement, onDone, onHighlight}:{measurement:MeasurementPayload; onDone:()=>void; onHighlight?:(cid:CellId|null)=>void}) {
  const [i, setI] = useState(0);
  const [applied, setApplied] = useState(0);

  const shownGrid = useMemo(()=>{
    let g = measurement.before;
    for (let k=0; k<applied; k++) {
      g = applyStep(g, measurement.sequence[k]);
    }
    return g;
  }, [measurement, applied]);

  useEffect(() => {
    setI(0);
    setApplied(0);
    if (onHighlight) onHighlight(measurement.sequence[0]?.cell ?? null);
    return () => { if (onHighlight) onHighlight(null); };
  }, [measurement]);

  const ev = measurement.sequence[i] || null;
  const total = measurement.sequence.length;

  const onNext = () => {
    if (!ev) { onDone(); return; }
    setApplied(prev => Math.min(prev + 1, total));
    const nextIndex = i + 1;
    if (nextIndex >= total) {
      if (onHighlight) onHighlight(null);
    } else {
      if (onHighlight) onHighlight(measurement.sequence[nextIndex].cell);
    }
    setI(nextIndex);
  };

  return (
    <div className="overlay">
      <div className="measure-panel" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'center'}}>
        <div style={{gridColumn:'1 / span 2', fontSize:18, opacity:.8, marginBottom:4}}>Fase di Misura</div>

        <div style={{justifySelf:'center'}}>
          <Board grid={shownGrid} selected={ev?.cell ?? null} highlight={ev?.cell ?? null} onSelect={()=>{}} />
        </div>

        <div>
          {ev ? (
            <>
              <div style={{marginBottom:6}}>Casella <b>{ev.cell}</b></div>
              {ev.die ? <div className="dice" style={{fontSize:36}}>Lancio d8 → <b>{ev.roll}</b></div> : <div className="dice">—</div>}
              <div>Risultato: <b>{ev.from}</b> → <b>{ev.to}</b> {ev.changed ? '' : '(invariato)'}</div>
              <div style={{marginTop:8, fontSize:12, opacity:.8}}>{i+1} / {total}</div>
              <button className="primary" style={{marginTop:12}} onClick={onNext}>Applica risultato e continua</button>
            </>
          ) : (
            <>
              <div>Tutte le misure sono state applicate.</div>
              <button className="primary" style={{marginTop:12}} onClick={onDone}>Concludi e mostra il risultato finale</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
