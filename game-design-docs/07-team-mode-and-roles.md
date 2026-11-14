# 07 · Solo and Team Mode (up to 4 players)

> Challenge sources: Objectives (*"individually or collaborate with a team of up to four people"*), strong solution (*"collaboration or multiplayer functionality for up to four participants"*), and the **Collaboration** considerations.
> Checklist: **R1, R2, N6, N10** ([03](03-requirements-checklist.md)). Solo play is enough to meet the Mandatory tier. Team mode is the top **Recommended** item.

---

## 1. Modes

| Mode | Players | How decisions happen |
|---|---|---|
| **Solo** | 1 | The player holds all roles. Optional "advisor" hints from each role ("Engineer: we're at 92% of launch mass!"). |
| **Team (local / hot-seat)** | 2–4 on one device | Roles take turns on their own decisions. Key decisions go to a vote (pass the device, or everyone clicks on one screen). **Minimum acceptable team mode.** |
| **Team (online)** | 2–4 on separate devices | Shared mission state synced over the network. Everyone sees the 3D view and HUD live. |
| **Competitive** *(nice to have)* | 2+ teams | Same objective, separate designs, compared on a leaderboard. |

With fewer than 4 players, the remaining roles are **merged** (for example, 2 players → Planner+Science and Engineer+Comms).

---

## 2. Roles

Matches the challenge's examples: *"mission planning, spacecraft design, science, communications, or resource management"*.

| Role | Colour (suggested) | Owns these decisions | Watches these resources | Typical tension |
|---|---|---|---|---|
| **Mission Planner** | Cyan | Objective, orbit, mission timeline, final GO/NO-GO, tie-breaker | Time (lifetime), overall score | Wants a safe plan that meets every requirement |
| **Spacecraft Engineer** | Amber | Structure, power, batteries, computer, attitude control, launch vehicle | Mass, power | Wants margins. Hates heavy instruments. |
| **Science Lead** | Violet | Instruments, observation targets, upgrades | Science value, data | Wants more and better instruments |
| **Comms & Resources** | Green | Antenna, downlink scheduling, budget approvals | Budget, communications, data downlink | Wants to save money and avoid lost data |

The tensions are deliberate. The challenge asks for *"situations where team members must negotiate between competing priorities"*.

---

## 3. Decision flow

```
Owner proposes ─▶ change shows as "PENDING" on everyone's HUD (with deltas)
               ─▶ other roles: 👍 approve / 👎 object (+ optional reason chip)
               ─▶ majority approves → applied; tie → Mission Planner decides
```

- **Small decisions** (inside your own area, no limit broken): applied immediately and logged.
- **Big decisions** (crosses a limit, costs > 10% of budget, objective/orbit/launch, all flight events): **vote required**.
- Every decision is logged (`who · what · effect`). The mission report uses the log for the "why" section and the collaboration score.

## 4. Negotiation events (nice to have, N6)

Short scripted dilemmas during design or flight, for example:

| Event | Science Lead wants | Engineer wants | Comms & Resources wants |
|---|---|---|---|
| "Budget cut −10%!" | Keep the instruments | Keep the margins | Downgrade the antenna |
| "Bonus target spotted!" | Extend observations | Protect the battery | Keep downlink time |
| "Launch slips 2 months" | n/a | Use the time for testing (+reliability) | Pay or wait (+cost) |

The team must reach one choice within a time limit (for example, 30 s). If they don't, the Planner's default applies, with a small collaboration penalty.

## 5. Collaboration score (part of the mission score)

- Consensus rate (share of votes that weren't overruled)
- Every role made at least N decisions (no passengers)
- Response time on flight events
- "Good call" bonus when a vote protected the mission (for example, safe mode during a storm)

Show a light-hearted **crew card** in the report: *"MVP: Science Lead: the spectrometer upgrade doubled your data."*

---

## 6. Real-time UX tips

- Each player's cursor or avatar is visible in their role colour (online mode).
- Role panels show only that role's controls. Everyone sees the shared HUD.
- In the 3D assembly bay, highlight the part a player is editing in their colour.
- Chat is optional. Quick **reaction chips** ("Too heavy!", "Need power!", "Over budget!", "Science!") are faster and fun.

---

## 7. Networking options (online team mode)

| Option | Effort | Notes |
|---|---|---|
| **Local hot-seat** | Low | No server. Implement this first. |
| **WebSocket server** (Node + `ws` / Socket.IO) | Medium | One room per mission. The server holds the authoritative state and broadcasts patches. |
| **Colyseus** (Node) | Medium | Built-in rooms and state sync for multiplayer games. |
| **Hosted realtime** (Firebase Realtime DB / Supabase Realtime / PartyKit) | Low–Medium | No server to run. Good for hackathons. |
| **Engine networking** (Unity Netcode, Godot High-level Multiplayer) | Medium | If you build in that engine |

**Architecture tip:** keep the **mission simulation as pure functions over a state object** ([09](09-build-guide.md)). Then solo, hot-seat and online all share the same game logic. Only the "who sends actions" layer changes.

Room join: a 4–6 character room code + player name + role pick. Never ask for personal data.
