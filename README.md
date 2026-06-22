# QTris – Modalità semplificata (v2.7.5)

- Turno con **2 carte obbligatorie**
- **Round configurabili**
- **Misura manuale a step** (utente avanza una casella alla volta)
- **Griglia finale applicata solo a fine misura**
- Mulligan guidato e fix pass-and-play
- RNG **robusto** (seed da qualsiasi tipo)
- **Banner non bloccante** quando l'avversario lascia
- **Online: join/crea disabilitati** durante la sessione + bottone **Abbandona**
- **Chiusura automatica stanza** se il browser viene chiuso (client `abandon` + server heartbeat ping/pong)

## Avvio
```bash
docker compose up --build
# Client: http://localhost:5173
# WS:     ws://localhost:8081
```


**v2.8.0 (UX)**

- Giocatori visualizzati come **Bianco (⚪)** e **Nero (⚫)**.

- Toast informativi per cambio fase/turno.

- Fase di misura completamente in italiano.

- HUD e stili più puliti e leggibili.

