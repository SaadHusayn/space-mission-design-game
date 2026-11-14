# 08 · Educational Content

> Challenge sources: **Educational value** considerations + Summary (*"evaluating how each choice shapes the success"*).
> Checklist: **M11, M13, R12, R13, N7** ([03](03-requirements-checklist.md)).
> Principle from the challenge: *"Consider teaching participants **why** a particular decision affects mission performance, rather than simply indicating whether the decision is correct or incorrect."*

---

## 1. Learning goals (what a player should understand after one mission)

1. A mission **starts with a science objective**. The objective drives every design choice.
2. A spacecraft is a **system**: changing one part changes mass, power, data, cost and lifetime.
3. **Launch vehicles** have limited **payload capacity**, and it shrinks the farther you go.
4. The **orbit** affects what you can see, how often you can talk to Earth, eclipses (and so batteries) and lifetime.
5. **Data must get home.** Instruments are useless without enough communications.
6. **There's no single perfect design.** Good engineering is balancing trade-offs within a budget.
7. Missions can fail, and **understanding why** is how engineers improve.

## 2. How to teach (in-game techniques)

| Technique | Where | Example |
|---|---|---|
| **Tooltips (1–2 sentences)** | Every part, resource, orbit, rocket | See §3 |
| **Trade-off popups** | Every upgrade | "▲ +28 science · ▲ +180 kg · ▲ +260 W · ▲ +60 Gb/day · ▲ +$65M" |
| **Visual indicators** | HUD bars (green/amber/red), 3D changes | The rocket visibly struggles when it's near its capacity |
| **Fix-it hints** on warnings | GO/NO-GO panel | "Too heavy → choose a lighter instrument or a bigger rocket" |
| **Guided first mission (tutorial)** | Cadet difficulty | §5 |
| **"Why" report** | End of mission | §6 |
| **Real missions like yours** | End of mission (optional) | §7 |
| **Learn more** links | Credits screen | Official resources ([02](02-challenge-resources.md)) |

Tone: friendly, short, no jargon without an explanation. Write for a curious 13-year-old **and** an engineering student.

## 3. Plain-language glossary / tooltip copy

| Term | Tooltip text |
|---|---|
| **Mission objective** | The science question your mission is built to answer. Everything else follows from it. |
| **Requirements** | The must-haves your spacecraft needs to meet the objective, like a big enough telescope or a long enough lifetime. |
| **Spacecraft bus** | The spacecraft's body. It holds everything together and limits how heavy the spacecraft can be. |
| **Payload** | The useful cargo, usually your science instruments. |
| **Solar array** | Panels that turn sunlight into electricity. Farther from the Sun means less power. |
| **Battery** | Stores energy for when your spacecraft is in Earth's (or a planet's) shadow. |
| **Eclipse** | Time spent in a shadow with no sunlight. Your battery must keep you running. |
| **Onboard computer** | The spacecraft's brain. Radiation in space can confuse weak computers. |
| **Attitude control** | Keeps the spacecraft pointed the right way, like aiming a camera steadily. |
| **Communications / downlink** | Sending data back to Earth by radio. Farther away means a weaker signal and slower data. |
| **Ground station** | A big antenna on Earth that talks to spacecraft. You can only send data when one can "see" you. |
| **Data rate** | How much information you can send per hour. |
| **Orbit** | The path your spacecraft follows around Earth or another body. |
| **Orbital altitude** | How high above the surface you orbit. Low = close views but more air drag. High = wider views and fewer shadows. |
| **LEO** | Low Earth Orbit, a few hundred km up. Fast laps, close views, frequent shadows. |
| **GEO** | Geostationary orbit, 35,786 km up. You circle once a day, so you stay above the same spot. |
| **Sun–Earth L2** | A balance point about 1.5 million km from Earth, opposite the Sun. Calm, cold and dark: great for telescopes. |
| **Launch vehicle** | The rocket. It decides how much mass you can send and where. |
| **Payload capacity** | The most mass a rocket can carry to a given orbit. It goes down the farther you go. |
| **Mission lifetime** | How long the mission is planned to work. Batteries wear out, radiation adds up, and low orbits slowly fall. |
| **Margin** | Extra room kept for surprises (for example, 10% spare power). Too little is risky. Too much is wasteful. |
| **Safe mode** | The spacecraft switches off non-essential systems to protect itself. |
| **Trade-off** | Gaining something by giving up something else. Space engineering is full of them. |

## 4. Concept cards (unlock as the player meets them)

Short 3-line cards with a small 3D or 2D visual, collected in a **"Mission Notebook"**:
*Mass budget · Power budget · Eclipses & batteries · Link budget (comms) · Payload capacity · Orbit types · Radiation · Mission lifetime · Systems engineering · Concept maturity (CML)*.

## 5. Tutorial: first guided mission (Cadet)

1. **Welcome:** "You're the mission team. Your goal: design a mission that works."
2. **Pick an objective:** highlight one card. Explain the requirements panel.
3. **Build:** add the parts one at a time, with a tooltip for each. Point at the HUD bar that moves.
4. **Trade-off moment:** offer an instrument upgrade, show the popup, and ask "Is it worth it?"
5. **Orbit:** compare 2 orbits with the 3D preview.
6. **Rocket:** choose a rocket that's too small on purpose → NO-GO with an explanation → fix it.
7. **Launch:** the player triggers it.
8. **Fly:** run at 10× speed, then trigger one mild event with a hint.
9. **Report:** read the "why" bullets. Press **Redesign & Re-fly** to try one change.

Target: ≤ 7 minutes, skippable, and replayable from the menu.

## 6. "Why" feedback templates (mission report)

Generate 3–5 bullets from the **decision log + simulation results**. Always reference the player's own choice and its effect.

| Situation | Template |
|---|---|
| Positive trade-off | "Your **{part}** added **{+science}** science for **{+mass} kg**. Worth it: you hit the science target." |
| Power failure | "Your instruments needed **{load} W**, but your arrays made **{gen} W** {at Mars / after the storm}. The battery ran flat on **day {d}**." |
| Data loss | "You collected **{data} Gb/day** but could send only **{downlink} Gb/day**. **{lost}%** of the science never reached Earth. A bigger antenna would have fixed this." |
| Budget | "You finished **${margin}M under budget**, a healthy margin." / "You went **${over}M over**, so the mission was cancelled before launch." |
| Lifetime | "The **{basic computer}** wore out after **{x} years** in high radiation. The objective needed **{y} years**." |
| Good team call | "The team's vote for **safe mode** saved the batteries during the solar storm." |
| Alternative path | "Another way to win: **{alternative design hint}**." (supports "no single perfect solution") |

## 7. "Real missions like yours" (optional, N7)

Idea from the NASA telescope game resource. Show 1 card matching the player's objective and orbit:

| Player design | Real mission to mention | One-line fact |
|---|---|---|
| Earth observation, sun-synchronous orbit | **Landsat** | Has imaged Earth's land surface from sun-synchronous orbit for decades. |
| Lunar orbiter | **Lunar Reconnaissance Orbiter (LRO)** | Maps the Moon from orbit, including the polar regions. |
| Mars atmosphere orbiter | **MAVEN** | Studies the upper atmosphere of Mars from orbit. |
| Telescope at Sun–Earth L2 | **James Webb Space Telescope** | An infrared observatory operating near Sun–Earth L2. |

Keep the facts short and verified against NASA sources. Link to the mission pages on the Learn more screen.

## 8. Accessibility of learning

- Explanations are available at **3 depths**: icon/colour → 1-line tooltip → "Learn more" card.
- Never block progress behind reading. Hints are optional except in the tutorial.
- Use units consistently (kg, W, Gb/day, $M, years) and round the numbers.
