# Phase 05 · Spacecraft Assembly and Engineering Review

> **Goal:** the heart of the game. In the 3D **Mission Design Center**, the crew and engineers **assemble the spacecraft from GLB parts that snap onto sockets**. Every choice updates the **live resource HUD** and shows its trade-offs. **Physics design tools** help the crew calculate. The **Engineering Review Board (ERB)** then evaluates the design with physics checks.
> **Player-facing result:** a fully interactive 3D assembly bay → ERB review with grades and fix hints → "Proceed to trajectory".
> **Depends on:** P02, P04 · **Challenge items:** **M3, M4, M7, M8**, M9 (partly), M13, R8, R14, **T1, T2**.

---

## 1. Story beats
- The crew enters the hangar. The spacecraft bus stands on a rotating cradle. Engineers greet the crew with pathway-specific advice ("At Jupiter your solar arrays get under 4% of Earth's sunlight", Kenji).
- The crew builds. Each engineer comments on choices in their discipline (short barks with a portrait).
- **ERB session:** the camera moves to a review table. Each discipline lights green, amber or red with a one-line verdict. Director Hale gives GO or "fix and return".

## 2. Scope

**Must**
- **Bus selection** (small / medium / large / crew module for crewed chapters), which defines the available **sockets**.
- **Slots per subsystem** (from the challenge list): structure/bus, **power** (solar S/M/L or RTG), **batteries**, **communications** (UHF/S/X/Ka), **onboard computer** (basic/standard/autonomous rad-hard), **attitude control**, **scientific instruments** (1–3 slots), + pathway-specific: propulsion stage (fuel mass), radiation vault, thermal, life support, spin habitat (crewed Mars), heat shield (crewed return).
- **Part browser** (cards with stats + tooltip + tier lock by difficulty, R8). Incompatible parts are greyed out with a reason (for example, "Magnetorquers don't work far from Earth").
- **3D snapping:** a part attaches to its `socket_*` empty with an animation (fly-in + click SFX + flash). Swapping replaces it. Removing detaches it.
- **Live resource HUD** (M7): Mass (vs bus limit and launch capacity) · Power (load vs generation **at the destination**) · Budget · Data/day · Comms (downlink at the destination) · Time (lifetime) · Δv · Science value. Colour states green/amber/red, with critical ★ resources highlighted.
- **Trade-off popup** on every change (M8): the deltas of all affected resources, for example "+28 science · +180 kg · +260 W · +60 Gb/day · +$65M · −0.4 km/s Δv".
- **Design Calculator** (physics tools, from the story): Δv calculator (rocket equation), power-at-distance slider (inverse square), downlink-at-distance, spin rpm calculator (crewed), with the formula shown.
- **ERB review** (02 §3): ERB-1…12 with pass/warn/fail, values vs limits, an explanation and a **fix hint**, a per-discipline grade, and an overall **GO / NO-GO**. Fail → back to assembly with the failing slot highlighted.

**Should**
- Visual consequence in 3D: a heavier craft visibly bigger; arrays sized to the choice; the RTG glows warm; the radiation vault visible as a titanium box; the spin habitat arm length matches the choice.
- Deploy animations (solar arrays unfold, antenna opens) when previewing "flight configuration".
- Engineer barks reacting to the HUD state (amber/red).
- Undo/redo (the design is a pure state, which makes this easy).

**Could**
- Free drag-and-drop placement onto sockets (vs click-to-equip).
- An "X-ray" view showing internal parts (battery, computer) inside the bus.
- Exploded view (parts offset outward) for learning.

## 3. 3D and visuals
- **Assets (GLB with sockets):** `bus_small/medium/large.glb`, `crew_module.glb`, `solar_s/m/l.glb` (+ `deploy` animation), `rtg.glb`, `battery.glb`, `computer_*.glb`, `adcs_*.glb`, `antenna_uhf/s/x/ka.glb` (+ `deploy`), `instrument_*.glb`, `prop_stage.glb`, `rad_vault.glb`, `radiator.glb`, `life_support_*.glb`, `spin_habitat_arm.glb` (scalable arm + pod), `heat_shield.glb`.
- **Texture mapping:** gold MLI foil (normal map with crinkles + high metalness/low roughness), solar cells (blue, grid normal map, slight iridescence via clearcoat), white thermal paint, titanium (brushed normal). ORM packed maps, KTX2.
- **Hangar:** baked lightmap, an HDRI for reflections, spotlights on the cradle, 1 shadow-casting light, subtle haze/dust particles, bloom on emissives.
- **Interaction:** raycast hover → outline; click socket → open part browser filtered to that slot; `<CameraControls>` orbit limits + double-click focus.

## 4. UI
- Left: slot list (subsystems, with ✓ once filled) · Centre: 3D · Right: Resource HUD + critical ★ · Bottom: part browser drawer · Floating: trade-off popup, engineer bark · Toolbar: Calculator, Undo/Redo, Exploded view, Requirements checklist, "Submit to ERB".
- ERB screen: a discipline table with a status icon + text (never colour alone), expandable explanations, a "Fix" button jumping to the slot.

## 5. Logic and data
- `design` in the store: `{ busId, slots: Record<SlotId, PartId | null>, options: { fuelMass, spinArm, recyclerOn } }`.
- Totals and ERB come from P02 (`sim/design.ts`, `sim/review.ts`). The UI never re-implements the math.
- Every change appends to the `decisionLog` (who, which role, what, deltas). The report "why" uses it.
- In team mode, slots are **owned by roles** (Engineer: bus/power/battery/ADCS/propulsion · Science: instruments · Comms & Resources: antenna/computer + budget approval · Commander: final submit to ERB). Others can propose (P08 adds votes).

## 6. Files to create
```
src/scenes/Hangar/{HangarScene,Cradle,SocketMarkers,PartPreview,ExplodedView}.tsx
src/three/models/*.tsx (gltfjsx-generated) · src/three/Spacecraft.tsx (assembles from design)
src/ui/{SlotList,PartBrowser,PartCard,ResourceHUD,TradeOffPopup,EngineerBark,DesignCalculator,ReviewBoard}.tsx
src/game/core/designActions.ts (equip/unequip/undo/redo)
public/models/parts/*.glb · public/hdri/hangar_2k.hdr
```

## 7. Acceptance criteria
- [ ] All challenge subsystems can be chosen: structure, power, batteries, communications, onboard computer, attitude control, instruments (M3/M4).
- [ ] Choosing or swapping a part updates the 3D model **and** all affected HUD values instantly. The trade-off popup lists every delta (M7/M8).
- [ ] ≥ 2 instruments per pathway with different mass/power/cost/data/science (M4).
- [ ] Incompatible parts are disabled **with a reason**.
- [ ] The Design Calculator computes the Δv, power-at-distance and rpm formulas, matching P02 values.
- [ ] The ERB shows all relevant checks with explanations + fix hints. A failing design cannot proceed. A passing design gets a grade and GO.
- [ ] The two balance-fixture designs from P02 can be built in the UI and pass the ERB.
- [ ] Hangar ≥ 60 fps (dev) / ≥ 30 fps (Low quality, integrated GPU).
- [ ] Playtest: a tester can explain one trade-off they made (T2/M13 check).

## 8. Risks and tips
- **Socket naming discipline** in Blender is critical. Write a validation script that lists the sockets in each bus GLB and compares them with `parts.json` slots.
- Keep part GLBs small (< 300 KB each). Share texture atlases between parts.
- Avoid HTML labels on every part. Use one floating info panel.
