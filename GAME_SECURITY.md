# Game Security Documentation

## Overview

This platform allows developers to submit custom games. All submissions go through a security review process before being published to players.

## Roles

| Role | Permissions |
|------|------------|
| **PLAYER** | Browse and play approved games |
| **DEVELOPER** | Submit games, edit own submissions, view scan results (requires paid subscription) |
| **ADMIN** | Review submissions, approve/reject/disable games, manage user roles |

## Submission Flow

```
Developer submits game
        ↓
Automated security scan runs
        ↓
  ┌─ PASS → Status: PENDING (awaits admin review)
  └─ FAIL → Status: REJECTED (auto-rejected with scan errors)
        ↓
Admin reviews submission
        ↓
  ┌─ APPROVED → Game appears in Community tab for all players
  ├─ REJECTED → Developer notified with reason, can edit & resubmit
  └─ DISABLED → Previously approved game taken down
```

## Security Scanning

Every submission is automatically scanned before entering the review queue.

### Forbidden Code Patterns

The scanner checks `.js`, `.ts`, `.html` files for dangerous patterns:

| Pattern | Reason |
|---------|--------|
| `eval()` | Arbitrary code execution |
| `new Function()` | Arbitrary code execution |
| `process.env` | Environment variable leak |
| `require('fs')` | Filesystem access |
| `require('child_process')` | System command execution |
| `require('net')` / `require('http')` | Unauthorized network access |
| `document.cookie` | Cookie theft |
| `localStorage.getItem('token')` | Auth token theft |
| `window.parent` / `window.top` | iframe escape |
| `parent.postMessage` | Unauthorized cross-frame messaging |
| External `<script src="...">` | Script injection (only trusted CDNs allowed) |

### File Whitelist

Only these file extensions are allowed in submissions:

- **Code**: `.html`, `.htm`, `.css`, `.js`, `.ts`, `.json`
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico`
- **Audio/Video**: `.mp3`, `.wav`, `.ogg`, `.mp4`, `.webm`
- **Fonts**: `.woff`, `.woff2`, `.ttf`, `.eot`
- **3D**: `.glb`, `.gltf`, `.obj`, `.fbx`
- **Other**: `.wasm`, `.txt`, `.md`

Any other file type is **blocked**.

### Manifest Validation

Each game should provide a manifest with:

```json
{
  "name": "My Game",
  "version": "1.0.0",
  "entry": "index.html",
  "description": "A fun game",
  "author": "developer_name",
  "mode": "singleplayer",
  "minPlayers": 1,
  "maxPlayers": 1
}
```

Required fields: `name`, `version`, `entry`.

## Game Isolation

### Current Architecture

- Community games are loaded in **sandboxed iframes** with `sandbox="allow-scripts allow-same-origin"`
- Games cannot access the parent window, cookies, or auth tokens
- Each game runs in its own isolated browsing context

### Future Enhancements (Planned)

- Full Content Security Policy (CSP) headers per game
- Controlled message passing via `postMessage` API with whitelist
- Network request monitoring and rate limiting
- Runtime behavior monitoring

## Approval Workflow

### Admin Review Checklist

When reviewing a submission, admins should verify:

1. **Security scan passed** — check the automated scan result
2. **Game URL is legitimate** — verify the hosted game URL
3. **Content is appropriate** — no offensive or malicious content
4. **Description is accurate** — game does what it claims
5. **No external data collection** — game doesn't secretly collect user data

### Admin Actions

- **Approve** — Game becomes visible to all players
- **Reject** — Game returned to developer with reason; developer can edit and resubmit
- **Disable** — Previously approved game taken offline (e.g., reported by players)

## Multiplayer Security

### Server-Authoritative Architecture

For multiplayer games, the platform enforces server-authoritative game state:

1. **Client sends action** (e.g., a move) → Server validates
2. **Server updates game state** → Server broadcasts to all players
3. **Client never determines outcome** — the server is the source of truth

### Why This Matters

- **Prevents cheating** — clients cannot report fake wins
- **Prevents desync** — all players see the same state
- **Prevents manipulation** — move validation happens server-side

### Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join_room` | Client → Server | Join a game room |
| `leave_room` | Client → Server | Leave a room |
| `start_game` | Client → Server | Start the game (host only) |
| `player_move` | Client → Server | Send a game action |
| `game_state_update` | Server → Client | Broadcast updated state |
| `game_over` | Server → Client | Game finished |

### Key Rules

- Never trust client-reported scores or win conditions
- All game logic runs on the server
- Clients are rendering engines only
- Reconnection is supported with 30-second grace period

## Developer Subscription

- **Monthly**: $1.99/month
- **Yearly**: $9.99/year
- Only registered (non-guest) accounts can subscribe
- Subscription expiry auto-disables developer mode and unpublishes games
- Guest accounts cannot access developer features
