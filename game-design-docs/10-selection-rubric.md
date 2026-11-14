# 10 · Selection Rubric: How We Pick the Best Version

> Every member's build is judged the same way. **Step 1 is a hard gate:** THE PROJECT MUST FULFILL THE REQUIREMENTS OF THE CHALLENGE.
> Also check the **official Space Apps judging criteria** on spaceappschallenge.org before the final submission, and polish the winner against them.

---

## Step 1: Gate (pass / fail)

A build must pass **all** of these to be scored:

| Gate | Check |
|---|---|
| G1 | All **Mandatory M1–M13** items are ✅ in its self-check table, and a reviewer confirms them by playing ([03](03-requirements-checklist.md)) |
| G2 | **T1 3D:** the assembly bay, launch and orbit/trajectory are real-time 3D with camera control |
| G3 | **T2 Interesting:** passes the playtest threshold (Step 3) |
| G4 | **T3 Runs easily:** a reviewer launches it from the README in < 2 minutes |
| G5 | **T4 In scope + licence-safe**, and `CREDITS.md` is present |
| G6 | A full mission can be played with **no crash and no dead end** |

If a build fails the gate but has great parts (for example, an amazing 3D launch), note them in the **"steal list"** for merging later.

---

## Step 2: Score (100 points)

| Category | Points | What scores high |
|---|---|---|
| **Challenge fulfilment depth** | 25 | Strong coverage of the M items **plus** many R items. Trade-offs feel real. Multiple valid solutions. |
| **Fun / engagement** | 20 | Testers want to replay. Tension, surprise, payoff. It feels like a game, not a form. |
| **3D quality & visual clarity** | 15 | Attractive, readable 3D. Consequences are visible in 3D. Smooth camera. Good performance. |
| **Educational clarity** | 15 | A beginner understands the *why*. Good tooltips, tutorial and report. |
| **Collaboration (team mode)** | 10 | Roles feel distinct, votes and negotiation work, up to 4 players. |
| **Polish & stability** | 10 | No bugs, fast load, consistent UI, sound, accessibility options. |
| **Originality (flavour)** | 5 | A distinct identity or a clever mechanic that makes it memorable. |

Each reviewer scores independently. Use the **average**. Ties go to the higher **Challenge fulfilment** score, then **Fun**.

---

## Step 3: Playtest protocol (for T2 and the "Fun" and "Educational" scores)

- **Testers:** at least 3 per build, including **at least 1 person with no space background**. Testers shouldn't be the build's author.
- **Task:** "Play one full mission. Then, if you want, try again." Don't explain the game. Observe.
- **Record:** time to finish, where they got stuck, whether they replayed voluntarily.
- **Questions after playing** (1–5 scale + one sentence):
  1. Did you understand what you had to achieve?
  2. Did your choices feel like they mattered?
  3. Can you name one trade-off you made and its effect? *(free answer → tests educational value)*
  4. Was it fun / would you play again?
  5. What was the best moment? The most confusing?
- **T2 pass threshold:** at least **2 of 3 testers** answer ≥4 on Q4, **or** replayed voluntarily.

---

## Step 4: Decide and merge

1. Rank the passing builds by score.
2. The **winner becomes the base** for the official submission.
3. Check the **steal list**. Port the best features from other builds into the winner if time allows (shared data JSON and pure logic make this easier).
4. Re-run the gate on the merged build.
5. Final polish against the official Space Apps judging criteria and submission requirements (project page, demo video, links, credits).
