import React, { useEffect } from 'react';

export type ToastItem = { id: number; text: string; };

export default function Toasts({items, onClose}:{items:ToastItem[]; onClose:(id:number)=>void}) {
  useEffect(()=>{
    const timers = items.map(it => setTimeout(()=>onClose(it.id), 2600));
    return ()=>{ timers.forEach(clearTimeout); };
  }, [items]);
  return (
    <div className="toasts">
      {items.map(it => (
        <div key={it.id} className="toast">
          <span>{it.text}</span>
        </div>
      ))}
    </div>
  );
}
