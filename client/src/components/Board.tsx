import React from 'react';
import type { CellId } from '../types';
import { colorEmoji } from '../gameLogic';

export default function Board({grid, selected, highlight, onSelect}:{grid:any; selected:CellId|null; highlight?:CellId|null; onSelect:(c:CellId)=>void}) {
  return (
    <div className="board">
      {([1,2,3,4,5,6,7,8,9] as CellId[]).map(cid=>{
        const c = grid[cid];
        const sel = selected===cid;
        const hi  = highlight===cid;
        return (
          <div key={cid} className={'cell'+(sel?' selected':'')+(hi?' highlight':'')} onClick={()=>onSelect(cid)}>
            <div className="cell-inner">
              <div className="cell-id">{cid}</div>
              <div className="cell-color">{colorEmoji(c.color)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
