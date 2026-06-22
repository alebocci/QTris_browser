# QTris - Simplified Mode

QTris is a two-player grid card game with local pass-and-play and online 1v1 matches. White plays as `A` (⚪), Black plays as `B` (⚫).

## Requirements

- Docker and Docker Compose, for the easiest setup
- Or Node.js 20+ and npm, to run the client and server manually

## Run With Docker

From the repository root:

```bash
docker compose up --build
```

Open the game at:

```text
http://localhost:5173
```

The WebSocket server runs at:

```text
ws://localhost:8081
```

Stop the stack with `Ctrl+C`. To remove the containers after stopping:

```bash
docker compose down
```

## Run Locally With npm

Install and start the server in one terminal:

```bash
cd server
npm install
npm run dev
```

Install and start the client in another terminal:

```bash
cd client
npm install
npm run dev
```

Open the URL printed by Vite, usually:

```text
http://localhost:5173
```

By default the client connects to `ws://localhost:8081`. If the server is hosted elsewhere, start the client with `VITE_SERVER_WS` set to the WebSocket URL.

## Build

Server:

```bash
cd server
npm run build
npm start
```

Client:

```bash
cd client
npm run build
npm run preview
```

## Online Match Steps

1. Both players open the game in their browsers.
2. Choose the number of rounds on the main menu. The default is 5 rounds, meaning 10 turns total: 5 for White and 5 for Black.
3. Player 1 clicks **Online game**, then **Create room**. This player becomes White.
4. Player 1 shares the generated room ID with Player 2.
5. Player 2 clicks **Online game**, enters the room ID, and clicks **Join**. This player becomes Black.
6. Both players complete the Mulligan. Enter comma-separated 0-based card indices to discard, or click **No discard**.
7. On your turn, select a grid cell first if the card needs a target, then click the card. Card `I` does not need a target.
8. Play exactly two cards, then click **End turn**.
9. After the final Black turn, the Measurement phase starts. Apply each measurement step until the final result is shown.
10. Use **Leave** to abandon an online room. If one player leaves, the other player is notified and the room is closed.

## Game Rules

- The board is a 3x3 grid. Each cell starts as White, Black, or a White/Black superposition.
- Each player starts with 6 cards and may take one Mulligan before the game begins.
- A round contains one White turn and one Black turn.
- At the start of each turn, the active player draws 2 cards.
- The active player must play exactly 2 cards before ending the turn.
- `I` counts as a played card but does not change a cell.
- `X` flips White to Black or Black to White. It does not affect superposition cells.
- `Z` flips the two superposition orientations: `BW_R` and `BW_L`.
- `Y` flips both normal colors and superposition orientations.
- `H` changes White to `BW_R`, Black to `BW_L`, `BW_R` to White, and `BW_L` to Black.
- During Measurement, each superposition cell rolls a d8: 1-4 becomes White, 5-8 becomes Black. Non-superposition cells stay unchanged.
- Scoring checks all rows, columns, and diagonals. A full White line scores for White, and a full Black line scores for Black.
- The player with more scored lines wins. Equal scores are a draw.
