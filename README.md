# RetroPlay - Multiplayer Game Platform

A retro OS-style browser-based multiplayer game platform with real-time gameplay, built as a full-stack application.

## Architecture

```
Diplom/
├── backend/                    # Node.js + Express + Socket.IO
│   ├── prisma/schema.prisma    # Database schema
│   ├── src/
│   │   ├── config/             # App configuration
│   │   ├── controllers/        # REST API routes
│   │   ├── games/chess/        # Chess engine (types, rules, engine)
│   │   ├── lib/                # Prisma & Redis clients
│   │   ├── middleware/         # Auth middleware
│   │   ├── services/           # Business logic layer
│   │   ├── sockets/            # WebSocket event handlers
│   │   └── server.ts           # Entry point
│   └── package.json
├── frontend/                   # Next.js + React + Tailwind + Zustand
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # UI components
│   │   │   ├── windows/        # Window content panels
│   │   │   ├── Window.tsx      # Draggable window system
│   │   │   ├── Taskbar.tsx     # OS-style taskbar
│   │   │   ├── ChessBoard.tsx  # Chess board renderer
│   │   │   └── DesktopIcons.tsx
│   │   ├── lib/                # Utilities, socket client
│   │   └── stores/             # Zustand state management
│   └── package.json
└── README.md
```

## Tech Stack

**Frontend:** Next.js 14, React 18, Tailwind CSS, Zustand, Socket.IO Client, Lucide Icons
**Backend:** Node.js, Express, Socket.IO, Prisma ORM, PostgreSQL, Redis
**Auth:** JWT-based with guest mode

## Features

- **Retro OS Desktop UI** — Draggable windows, taskbar, start menu, pixel aesthetic
- **Chess Game Engine** — Full server-authoritative chess with move validation, check/checkmate/stalemate detection, castling, en passant, promotion, draw conditions
- **Real-time Multiplayer** — Socket.IO with server-authoritative game state
- **Matchmaking** — ELO-based queue with Redis, auto-match, room creation
- **Room System** — Create/join rooms, ready system, room codes
- **Chat** — In-game and lobby chat
- **Leaderboard** — ELO rankings with win/loss/draw stats
- **Player Profiles** — Stats, rating, match history
- **Reconnection** — 30-second reconnect window on disconnect
- **Extensible** — Game engine architecture supports adding card games, battle games

## Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional — falls back to in-memory store)

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Configure `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/retro_games"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

Run database migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Start the server:
```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Join a game room |
| `leave_room` | Client → Server | Leave a room |
| `ready` | Client → Server | Toggle ready state |
| `start_game` | Client → Server | Start game (host) |
| `player_move` | Client → Server | Send a chess move |
| `game_state_update` | Server → Client | Updated board state |
| `game_over` | Server → Client | Game finished |
| `match_found` | Server → Client | Matchmaking result |
| `chat_message` | Bidirectional | Chat messages |
| `reconnect_game` | Client → Server | Reconnect to game |

## Deployment

- **Frontend** → Vercel (`next build`)
- **Backend** → Railway / Render
- **Database** → PostgreSQL on Railway
- **Redis** → Upstash

## Game Engine

The chess engine (`backend/src/games/chess/`) is fully server-authoritative:

1. Client sends move intent
2. Server validates move legality
3. Server updates board state
4. Server broadcasts state to all players

Supports: all standard chess rules, castling, en passant, pawn promotion, check/checkmate/stalemate detection, insufficient material draw, 50-move rule, threefold repetition.
