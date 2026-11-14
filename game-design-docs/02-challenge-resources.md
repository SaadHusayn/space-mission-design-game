# 02 · Challenge Resources (official text + how we use them)

> **Source:** https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources
> **Fetched:** 2026-11-14 (resources were added on 2026-11-13)

Part A is copied **word for word** from the official Resources tab, with only the formatting converted to Markdown.

Part B is **our team's notes** on how each resource helps the game. The challenge says we may use other resources too.

---

## Part A: Official Resources tab

NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.

### NASA Data & Resources

[Design and Develop Science Missions](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf?emrc=a454cf): An overview of the systems-engineering approach used to develop scientific space missions. It explains how a mission progresses from an initial scientific need through requirements definition, design, verification and implementation. Four major mission segments are identified:

- Launch segment: the launch vehicle and services required to place the mission in space.
- Space segment: spacecraft, instruments, orbiters, landers or rovers used to conduct the mission.
- Ground segment: ground stations and mission-control facilities responsible for communication, data reception and mission management.
- User segment: scientists and other users who analyse and apply the mission's data.

[General Mission Analysis Tool (GMAT)](https://software.nasa.gov/software/GSC-19468-1): GMAT is an open-source, enterprise-level software system developed to support the design, analysis, optimisation, and navigation of space missions. Developed through collaboration involving NASA, private industry, academia, and other contributors, GMAT provides a comprehensive environment for modelling and analysing spacecraft trajectories across a wide range of mission scenarios. These include low Earth orbit, geostationary and highly elliptical orbits, lunar missions, libration-point trajectories, interplanetary transfers, and deep-space exploration.

GMAT enables users to model spacecraft, propulsion systems, trajectories, manoeuvres, and other mission components using high-fidelity physical models. It can be used for orbit propagation, trajectory optimisation, orbit determination, navigation-data simulation, launch-window analysis, manoeuvre planning, and the evaluation of different mission scenarios and engineering trade-offs. The software also provides capabilities for visualising mission parameters and analysing results through plots, reports, and other analytical outputs.

[Concept Maturity Levels (CMLs)](https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299): The paper presents CMLs, a framework developed by NASA’s Jet Propulsion Laboratory (JPL) to measure and progressively develop the maturity of a space mission concept before entering formal project formulation.

The framework divides mission development into stages, from CML 1 (an initial mission idea) through increasingly detailed levels involving feasibility analysis, trade studies, point design, implementation planning, and detailed engineering. The paper focuses mainly on CML 1–4, where the greatest design decisions are made.

[Mission Design Lab (MDL)](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/): NASA’s MDL is a collaborative environment where engineers and scientists rapidly develop and evaluate space mission concepts. It helps transform an initial idea into a technically assessed mission design. The MDL uses different levels of study depending on how mature the mission concept is:

- Office Hours: Quick brainstorming and identification of major challenges.
- Concept Development: Feasibility and risk assessment.
- Trade Studies: Compare different mission architectures and design options.
- Point Design: More detailed design, including CAD models, equipment lists, engineering models and cost estimates.

It considers the complete mission, including orbit and trajectory, spacecraft, communications, ground systems, launch vehicle, mission operations and end-of-mission planning. It also analyses key spacecraft disciplines such as power, propulsion, thermal, structures, avionics, communications, attitude control, software, reliability, cost and risk.

[NASA Mission Viz](https://nasa.github.io/mission-viz/): NASA Mission Viz is an interactive, web-based visualization environment designed to represent and explore space mission concepts and trajectories. When users access the platform, they are presented with a three-dimensional representation of the space environment, in which celestial bodies, spacecraft, and mission trajectories can be visually examined.

The platform enables users to explore the spatial and temporal characteristics of a mission, including the movement of spacecraft along predefined trajectories and their relationships with relevant celestial bodies. Through interactive visualization, users can change their perspective and examine the mission from different viewpoints, facilitating a more intuitive understanding of orbital and interplanetary dynamics.

Mission Viz is particularly relevant for space mission design and education, as it provides a visual means of communicating concepts that are otherwise difficult to interpret through numerical data alone. The representation of trajectories, spacecraft positions, celestial bodies, and mission events can help users understand the relationship between mission objectives, orbital mechanics, spacecraft movement, and mission operations.

[A Learning Game About Telescopes](https://science.nasa.gov/mission/webb/game-build-it-yourself/): When users access this game, they enter an educational simulation in which they assume the role of a scientist responsible for designing a space telescope. The game is intended to demonstrate how scientific objectives determine the engineering characteristics of a space mission.

The player begins by selecting the scientific objectives that the satellite should investigate. Based on these objectives, the player must then select appropriate wavelengths, scientific instruments, and optical systems. The available choices are constrained, and some options are unavailable when they are not scientifically or technologically compatible with the selected mission objectives.

The game is organized into three levels of increasing complexity. At higher levels, players can select multiple scientific objectives and corresponding wavelengths, instruments, and optical configurations. This progressively introduces the concept that a more ambitious scientific mission requires more complex and carefully coordinated engineering decisions.

After completing the design, the player launches the satellite through an animated sequence. The game then presents the resulting spacecraft configuration and provides scientific results based on the player's design. It also identifies real NASA missions with similar characteristics and scientific objectives, allowing the player to relate their virtual design to actual space missions.

[Cubesat 101 - Basic Concepts and Processes for First-Time CubeSat Developers](https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf): This document was created for cubesat missions developers (CSLI mainly). This is a powerful guide with basic concepts of every phase of a cubesat space mission, from ConOps to launch and operation.

[Visualize a Space Mission Using Virtual Reality](https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/): This was a 2023 NASA Space Apps Challenge focused on making complex space missions easier to understand through interactive virtual reality (VR). The challenge was classified as suitable for beginners/youth, intermediate, and advanced participants, with a focus on games, software, space exploration, and planets and moons.

The challenge asked participants to develop an interactive VR application capable of visualising an entire space mission, including:

- Mission concept: what the spacecraft is intended to accomplish.
- Orbital trajectories: how the spacecraft travels through space, such as Earth orbit, Earth–Moon transfers, planetary orbits, or deep-space trajectories.
- Mission timeline: the sequence and timing of major mission events and operations.
- Three-dimensional visualization: allowing users to explore and better understand the spatial relationships and dynamics of the mission.

### Space Agency Partner Resources

**CSA (Canadian Space Agency)**

[Digital Games and Activities](https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp): Explore the CSA collection of digital games, e-books, videos, and hands-on activities designed for learners of all ages. These interactive resources make space science and exploration accessible, engaging, and fun while highlighting Canada's role in space.


---

## Part B: How each resource maps to our game (team notes)

| # | Resource | What to take from it | Where it shows up in the game |
|---|---|---|---|
| R1 | **Design and Develop Science Missions** (NASA PDF) | A mission flows from **science need → requirements → design → verification → implementation**. It has **four segments**: Launch, Space, Ground, User. | Our phase order (Objective → Requirements → Spacecraft → Orbit/Launch → Fly → Report). The 3D world should show all four segments: the **rocket** (launch), the **spacecraft** (space), **ground stations** receiving data (ground), and **science results** delivered to scientists in the report (user). |
| R2 | **GMAT – General Mission Analysis Tool** | Orbit types (LEO, GEO, highly elliptical, lunar, libration point/L2, interplanetary, deep space), launch windows, manoeuvre planning, trade-off evaluation. | Orbit and destination list, the "launch window" mini-event, Δv/fuel as an optional advanced resource. **We don't need GMAT's accuracy.** Use simplified, plausible values and say so on screen. |
| R3 | **Concept Maturity Levels (JPL)** | Mission concepts mature in stages, from CML 1 (an idea) through feasibility, trade studies and point design. | Progression and difficulty: a **"CML" meter** that rises as the player completes each phase (CML 1 idea → CML 4 point design). It works well as a progress bar or level name. |
| R4 | **Mission Design Lab (NASA GSFC)** | A collaborative team studies one mission: Office Hours → Concept Development → Trade Studies → Point Design. Disciplines covered: power, propulsion, thermal, structures, avionics, comms, attitude control, software, reliability, cost, risk. | **Team mode roles** and the "design review" moment. Each MDL discipline maps to a spacecraft subsystem the player configures. The final report can be styled as an MDL-like "study summary". |
| R5 | **NASA Mission Viz** | An interactive **3D** web view of celestial bodies, spacecraft and trajectories, with free camera viewpoints. | **Reference for our mandatory 3D orbit and trajectory view** (see [05-3d-and-fun-requirements.md](05-3d-and-fun-requirements.md)). Players should be able to orbit the camera, zoom, and watch the spacecraft move along its path. |
| R6 | **A Learning Game About Telescopes** (NASA Webb) | Science objectives decide the engineering choices. Incompatible options are locked. There are 3 levels of increasing complexity, an animated launch, results, and a link to **real NASA missions with similar characteristics**. | Objective-first flow, locked or greyed-out incompatible parts with a reason shown, 3 difficulty levels, a launch cinematic, and an end screen card: **"Real missions like yours"** (for example, an L2 telescope → JWST). **Do not copy its art or UI. Take the ideas only.** |
| R7 | **CubeSat 101** (NASA CSLI) | Beginner-friendly phases: ConOps → design → build → launch → operations. Practical small-satellite subsystems and constraints. | A **"CubeSat" beginner scenario** (small budget, tiny mass, simple parts) for the Cadet difficulty. Use it as a source for simple-language explanations of subsystems. |
| R8 | **Visualize a Space Mission Using VR** (Space Apps 2023) | A whole-mission visualization: concept, orbital trajectories, timeline, **3D**. | Supports our 3D requirement. Add a **mission timeline** scrubber in the flight phase. VR/WebXR is an optional stretch goal. |
| R9 | **CSA Digital Games and Activities** | Examples of fun, accessible space games for all ages. | Tone and accessibility benchmark for **Beginner/Youth** players. |

### Rules for using resources

- Follow each website's data-use terms (see the disclaimer at the top of Part A).
- Credit every resource we use on an in-game **Credits / Learn more** screen and in the submission.
- Use NASA imagery only where its media usage guidelines allow it. **Do not use the NASA insignia ("meatball") or agency logos as our branding.**
- We may add other open resources (planet textures, 3D models, sounds) **only if their licence allows it**. Record each one in `CREDITS.md` in your build.
