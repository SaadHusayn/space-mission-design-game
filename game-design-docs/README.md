# Space Mission Design Game: Team Game Design Docs
### NASA Space Apps Challenge 2026 · working title: *Mission Forge* (each version may pick its own name)

> **Why this folder exists:** each team member builds **their own complete version** of the game from these docs. Then we play every version and **select the best one** (or merge the best parts) to submit.
> Read this README first, then the files in order.

---

## 🚨 The 3 golden rules (non-negotiable)

### 1. THE PROJECT MUST FULFILL THE REQUIREMENTS OF THE CHALLENGE.
A build that doesn't meet every **Mandatory (M)** item in [03-requirements-checklist.md](03-requirements-checklist.md) is **out of the selection**, however good it looks.
Requirements come from the official challenge page ([01-challenge-details.md](01-challenge-details.md)). Don't drift outside the challenge's scope.

### 2. THE GAME MUST BE 3D.
At minimum, the spacecraft, the launch and the orbit or trajectory view are real-time 3D scenes that the player can look around. Flat 2D menus on top of the 3D world are fine. A purely 2D game is not. See [05-3d-and-fun-requirements.md](05-3d-and-fun-requirements.md).

### 3. THE GAME MUST BE INTERESTING TO PLAY.
It must be a **game**, not a spreadsheet or a quiz: meaningful choices, visible consequences, tension, surprises, a satisfying payoff, and a reason to play again. See [05-3d-and-fun-requirements.md](05-3d-and-fun-requirements.md).

> ⚖️ **Priority order when time is short:** Rule 1 core loop first → then 3D → then polish and fun → then optional features.
> Most items on the challenge page are written as *"could"*, *"consider"* or *"may"*. They're **optional ideas, not requirements.** Don't try to build everything. Build the **core loop** really well. The checklist separates **Mandatory**, **Recommended** and **Nice to have** for you.

---

## What the challenge asks (in one paragraph)

> *"Your challenge is to create an interactive game that allows participants to design, manage, and simulate a complete space mission while making engineering decisions, managing limited resources, and evaluating how each choice shapes the success of their mission."*
> (official challenge summary)

In plain words: the player picks a **mission objective**, builds a **spacecraft** with **instruments**, chooses a **launch vehicle** and **orbit**, juggles **budget, mass, power, data, communications and time**, **flies** the mission, and gets **feedback explaining why** it succeeded or failed. The game can be played **solo or by a team of up to 4**.

- **Difficulty levels listed by Space Apps:** Beginner/Youth, Intermediate
- **Skill tag:** Games

---

## The shared skeleton in 30 seconds

Every version follows this **basic structure** ([04-game-concept.md](04-game-concept.md)). Look, feel, theme and mechanics are up to each builder.

```
CREW LOBBY ─▶ 1 OBJECTIVE ─▶ 2 SPACECRAFT ─▶ 3 ORBIT ─▶ 4 LAUNCH VEHICLE ─▶ LAUNCH ─▶ 5 FLY ─▶ EVENTS ─▶ 6 REPORT
 solo/team     pick mission   assemble in 3D   pick orbit  capacity/cost check   3D        3D map +   solar storm,   score + "why"
 up to 4       + requirements  live resources  + explain   GO / NO-GO            cinematic dashboard  team votes     + leaderboard
                                                                                                                       │
                                     ◀──────────────── REDESIGN & RE-FLY (try a different design) ◀───────────────────┘
```

**The message of the game:** *"Every mission is a trade-off. There's no single perfect mission. Redesign. Re-fly. Learn."*

**Each version is independent.** Same skeleton and same requirements, but its **own flavour**: name, theme, art style, build mechanic, flight mechanic, events. See the freedom zones in [09-build-guide.md](09-build-guide.md) §5.

---

## Document map

| # | File | What's inside | Who must read it |
|---|---|---|---|
| 00 | **README.md** (this file) | Golden rules, overview, how to start | Everyone |
| 01 | [01-challenge-details.md](01-challenge-details.md) | Official challenge text, **word for word** | Everyone |
| 02 | [02-challenge-resources.md](02-challenge-resources.md) | Official resources list + how each one maps to the game | Everyone |
| 03 | [03-requirements-checklist.md](03-requirements-checklist.md) | ✅ **Mandatory / Recommended / Nice to have** checklist with tests | Everyone. **Fill it in before submitting** |
| 04 | [04-game-concept.md](04-game-concept.md) | Shared skeleton: game loop, phases (required vs your flavour), screens, one reference example | Everyone |
| 05 | [05-3d-and-fun-requirements.md](05-3d-and-fun-requirements.md) | What must be 3D, what makes it fun, art direction, tech options | Everyone |
| 06 | [06-game-systems-and-data.md](06-game-systems-and-data.md) | Parts, instruments, rockets, orbits, formulas, events, scoring (starter data) | Builders |
| 07 | [07-team-mode-and-roles.md](07-team-mode-and-roles.md) | Solo + team of up to 4, roles, voting, negotiation, networking options | Builders |
| 08 | [08-educational-content.md](08-educational-content.md) | Plain-language explanations, glossary, tutorial, "why" feedback, real-mission cards | Builders + writers |
| 09 | [09-build-guide.md](09-build-guide.md) | How to build your version: MVP scope, milestones, architecture, deliverables | Builders |
| 10 | [10-selection-rubric.md](10-selection-rubric.md) | How we pick the best build: gate + scoring + playtest script | Everyone |

---

## How to start (for each team member)

1. **Read** 01 → 03 (what's required), then 04 → 05 (the skeleton + 3D/fun rules).
2. **Decide your flavour**: write a 3–5 sentence flavour statement (theme, style, special mechanic) ([09](09-build-guide.md) §5).
3. **Pick your tech** (see the options in 05). Any engine is fine if the game is **3D** and judges can open it easily.
4. **Build the MVP first** ([09-build-guide.md](09-build-guide.md) § MVP). That's the full core loop with simple 3D, end to end.
5. **Then** add the 3D polish, fun, team mode and extras, in the priority order of the checklist.
6. **Self-check** with [03-requirements-checklist.md](03-requirements-checklist.md) and copy the filled table into your build's README.
7. **Deliver** your build package for selection ([09-build-guide.md](09-build-guide.md) § Deliverables).

You're free to be creative. You can change visuals, names, mechanics, extra scenarios and so on, **as long as all Mandatory items stay satisfied** and the game stays 3D and fun. The skeleton is a backbone, not a cage.

---

## Rules and compliance notes for the competition

- Check the **official Space Apps rules and event dates** on spaceappschallenge.org before submitting. The site reminded participants **not to begin project work before the hackathon starts**.
- Use only assets (models, textures, sounds, fonts, code) whose **licence allows it**, and list them all in `CREDITS.md`.
- **Don't use the NASA insignia or agency logos as our game's branding.** Credit NASA and partner resources as sources instead. Note the resources disclaimer: *"NASA does not endorse any non-U.S. Government entity…"*.
- Numbers in the game may be **simplified or illustrative**. Say so in-game (for example, "Simplified model for learning"). Don't claim real-world accuracy we don't have.
- Keep everything **within the challenge scope**: designing, managing and simulating a space mission with trade-offs.
