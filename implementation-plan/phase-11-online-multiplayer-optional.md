# Phase 11 · Online Multiplayer (optional)

> **Goal:** up to **4 players on separate devices** share one mission in real time, with the same roles, proposals and votes as hot-seat (P08).
> **Depends on:** P08 · **Challenge items:** N10 (stretch). Team play itself is already covered by hot-seat (R1). **Only do this if P01–P10 are complete and stable.**

---

## 1. Approach
Because all rules are **pure functions** (`state, action → state`) in `src/game/**`, online play only needs:
1. **Rooms:** create/join with a 4–6 character code. Choose a call-sign and role. No accounts, no personal data.
2. **Authoritative state:** the server (or the host client) runs the reducer. Clients send **actions** (`EQUIP_PART`, `PROPOSE`, `VOTE`, `CHOOSE_EVENT_OPTION`, …) and receive state patches.
3. **Presence:** who's connected, role colours, cursors/selection highlights in the 3D hangar.
4. **Sync of time-based phases:** the journey clock runs on the host. Clients display it. Events pause for all.

## 2. Technology options
| Option | Notes |
|---|---|
| **PartyKit** (Cloudflare) | Simple rooms + WebSocket, the server runs the TS reducer. Good fit with Next.js on Vercel. |
| **Socket.IO** on a small Node server | Flexible, needs separate hosting (Render, Fly.io, Railway). |
| **Colyseus** | Built-in rooms and state sync for games, Node hosting. |
| **Liveblocks / Supabase Realtime** | Hosted presence + storage. Fewer server concerns. |

Recommendation: **PartyKit or Socket.IO**, with a **server-authoritative reducer** that shares code with the client (`src/game/**`).

## 3. Scope
**Must:** rooms, roles, sync of design/proposals/votes/events, reconnection (rejoin by code + call-sign), host migration or "room ends" handling.
**Should:** presence highlights in 3D, quick reaction chips ("Too heavy!", "Need power!", "Science!").
**Could:** competitive mode, where 2 teams solve the same pathway and are compared on a shared leaderboard (N3).

## 4. Files to create
```
party/ (or server/) room.ts — loads src/game reducer, validates actions, broadcasts state
src/net/{client,protocol,usePresence}.ts
src/ui/{RoomLobby,PresenceBar,ReactionChips}.tsx
```

## 5. Acceptance criteria
- [ ] 4 browsers on different machines can join one room, take roles, build, vote, fly and see the same report.
- [ ] Invalid or out-of-turn actions are rejected by the server.
- [ ] A disconnected player can rejoin and recover the state.
- [ ] Latency < 200 ms for votes and equips on normal connections.

## 6. Risks and tips
- Networking bugs can eat a whole hackathon. Keep hot-seat as the guaranteed fallback.
- Never sync Three.js objects, only game state. Each client renders its own 3D from the state.
