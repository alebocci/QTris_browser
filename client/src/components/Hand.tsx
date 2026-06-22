import React, { useState } from 'react';
import type { Card } from '../types';
import { cardLabel } from '../gameLogic';

export default function Hand({hand, onPlay}:{hand:Card[]; onPlay:(c:Card)=>void;}) {
  const [selected, setSelected] = useState<number|null>(null);
  return (
    <div className="hand">
      <h3>Mano</h3>
      <div className="cards">
        {hand.map((c, i)=>(
          <button key={i} className={'card'+(i===selected?' sel':'')} onClick={()=>{ setSelected(i); onPlay(c);} }>{cardLabel(c)}</button>
        ))}
      </div>
      <div className="hint">Clicca una carta per giocarla (se richiede casella, selezionala sulla griglia).</div>
    </div>
  );
}
