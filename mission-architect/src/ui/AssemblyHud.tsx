'use client';

import { useMemo, useState } from 'react';

import { emptyDesign, reviewDesign, SLOT_ACTOR, summarizeDesign } from '@/game';
import { AVATAR_COLOURS, ROLES, type RoleId } from '@/game/core/crew';
import { missionContract } from '@/game/sim/requirements';
import { useGame } from '@/hooks/useGame';
import { useCurrentMission } from '@/scenes/Briefing/BriefingScenes';
import { assemblyStore, useAssembly } from '@/scenes/Hangar/assemblyStore';

import { Button } from './Button';
import { DecisionLog } from './DecisionLog';
import { DesignCalculator } from './DesignCalculator';
import { EngineerBark } from './EngineerBark';
import { PartBrowser } from './PartBrowser';
import { ResourcePanel } from './ResourcePanel';
import { SlotList } from './SlotList';
import { TradeOffPopup } from './TradeOffPopup';
import { VotePanel } from './VotePanel';

export function AssemblyHud() {
  const [decisionLogOpen, setDecisionLogOpen] = useState(false);
  const [enforceRoleVotes, setEnforceRoleVotes] = useState(false);

  const mission = useCurrentMission();
  const crew = useGame((state) => state.profile.crew);
  const activeCrewIndex = useGame((state) => state.activeCrewIndex);
  const activeVote = useGame((state) => state.activeVote);
  const design = useGame((state) => state.design);
  const designPast = useGame((state) => state.designPast);
  const designFuture = useGame((state) => state.designFuture);
  const decisionLog = useGame((state) => state.decisionLog);

  const editDesign = useGame((state) => state.editDesign);
  const proposeDesignChange = useGame((state) => state.proposeDesignChange);
  const setActiveCrewIndex = useGame((state) => state.setActiveCrewIndex);
  const nextCrewTurn = useGame((state) => state.nextCrewTurn);
  const setVoteHandoff = useGame((state) => state.setVoteHandoff);
  const acknowledgeVoteHandoff = useGame((state) => state.acknowledgeVoteHandoff);
  const submitMemberVote = useGame((state) => state.submitMemberVote);
  const breakVoteTie = useGame((state) => state.breakVoteTie);
  const cancelActiveVote = useGame((state) => state.cancelActiveVote);
  const undoDesign = useGame((state) => state.undoDesign);
  const redoDesign = useGame((state) => state.redoDesign);
  const submitToErb = useGame((state) => state.submitToErb);
  const goTo = useGame((state) => state.goTo);

  const selectedTarget = useAssembly((state) => state.selectedTarget);
  const exploded = useAssembly((state) => state.exploded);
  const calculatorOpen = useAssembly((state) => state.calculatorOpen);
  const requirementsOpen = useAssembly((state) => state.requirementsOpen);

  const activeDesign = useMemo(() => design ?? emptyDesign(), [design]);

  const summary = useMemo(
    () => (mission ? summarizeDesign(activeDesign, mission) : null),
    [activeDesign, mission],
  );
  const previousDesign = designPast.length > 0 ? designPast[designPast.length - 1] : null;
  const previousSummary = useMemo(
    () => (mission && previousDesign ? summarizeDesign(previousDesign, mission) : undefined),
    [mission, previousDesign],
  );
  const review = useMemo(
    () => (mission ? reviewDesign(activeDesign, mission) : null),
    [activeDesign, mission],
  );

  if (!mission || !summary || !review) return null;

  const latestDecision = decisionLog.length > 0 ? decisionLog[decisionLog.length - 1] : null;
  const contract = missionContract(mission);
  const isTeam = crew.length > 1;
  const activeMember = crew[activeCrewIndex] ?? crew[0];
  const slotOwnerRole = ROLES[(SLOT_ACTOR[selectedTarget] as RoleId) ?? 'engineer'];
  const activeOwnsSlot = activeMember?.roles.includes(slotOwnerRole.id) ?? true;

  const handleDesignChange = (change: Parameters<typeof editDesign>[0]) => {
    if (isTeam && enforceRoleVotes) {
      proposeDesignChange(change);
    } else {
      editDesign(change);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between overflow-y-auto p-3 sm:p-5">
      {/* Top Bar: Title + Toolbar + Hot-Seat Turn Bar */}
      <header className="pointer-events-auto flex flex-col gap-2.5 rounded-2xl border border-line bg-panel px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Step 2 · Spacecraft Assembly · Chapter {mission.pathway.chapter}
            </p>
            <h2 className="text-xl font-bold text-ink sm:text-2xl">
              {mission.pathway.name}: Assembly Bay
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={designPast.length === 0}
              onClick={() => undoDesign()}
              className="rounded-lg border border-line bg-black/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              disabled={designFuture.length === 0}
              onClick={() => redoDesign()}
              className="rounded-lg border border-line bg-black/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Redo
            </button>
            <button
              type="button"
              aria-pressed={exploded}
              onClick={() => assemblyStore.getState().toggleExploded()}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                exploded
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-line bg-black/30 text-ink hover:border-accent'
              }`}
            >
              Exploded View
            </button>
            <button
              type="button"
              onClick={() => assemblyStore.getState().setCalculatorOpen(true)}
              className="rounded-lg border border-line bg-black/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-accent"
            >
              Calculator
            </button>
            <button
              type="button"
              aria-expanded={requirementsOpen}
              onClick={() => assemblyStore.getState().setRequirementsOpen(!requirementsOpen)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                requirementsOpen
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-line bg-black/30 text-ink hover:border-accent'
              }`}
            >
              Contract
            </button>
            <button
              type="button"
              aria-expanded={decisionLogOpen}
              onClick={() => setDecisionLogOpen((open) => !open)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                decisionLogOpen
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-line bg-black/30 text-ink hover:border-accent'
              }`}
            >
              Log ({decisionLog.length})
            </button>
            <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={() => goTo('OBJECTIVE')}>
              BACK TO OBJECTIVE
            </Button>
            <Button className="px-5 py-1.5 text-xs" onClick={() => submitToErb()}>
              SUBMIT TO ERB ({review.counts.fail === 0 ? 'READY' : `${review.counts.fail} ISSUES`})
            </Button>
          </div>
        </div>

        {/* Hot-Seat Team Mode Turn & Role Ownership Bar (2–4 players) */}
        {isTeam && activeMember && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2 text-xs"
            role="region"
            aria-label="Hot-seat crew turn bar"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                Active Astronaut:
              </span>
              {crew.map((member, index) => {
                const isCurrent = index === activeCrewIndex;
                const roleCol = ROLES[member.roles[0] ?? 'commander'].colour;
                return (
                  <button
                    key={member.id}
                    type="button"
                    aria-pressed={isCurrent}
                    onClick={() => setActiveCrewIndex(index)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold transition ${
                      isCurrent ? 'font-bold text-ink shadow' : 'text-muted hover:text-ink'
                    }`}
                    style={{
                      borderColor: isCurrent ? roleCol : 'rgba(255,255,255,0.2)',
                      backgroundColor: isCurrent ? `${roleCol}26` : 'rgba(0,0,0,0.35)',
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: AVATAR_COLOURS[member.avatar % AVATAR_COLOURS.length] }}
                    />
                    {member.callSign || `P${index + 1}`} (
                    {member.roles.map((r) => ROLES[r].short).join('/')})
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => nextCrewTurn()}
                className="rounded-lg border border-accent/50 bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent hover:bg-accent/25"
              >
                Pass Turn ⏭
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span
                className="rounded border px-2 py-0.5 font-bold"
                style={{
                  borderColor: slotOwnerRole.colour,
                  color: slotOwnerRole.colour,
                  backgroundColor: `${slotOwnerRole.colour}18`,
                }}
              >
                Slot Owner: {slotOwnerRole.short} ({slotOwnerRole.name})
              </span>
              <button
                type="button"
                aria-pressed={enforceRoleVotes}
                onClick={() => setEnforceRoleVotes((v) => !v)}
                className={`rounded-lg border px-2.5 py-0.5 font-mono text-[11px] font-bold transition ${
                  enforceRoleVotes
                    ? 'border-accent bg-accent/25 text-accent'
                    : 'border-line bg-black/35 text-muted hover:border-accent/50 hover:text-ink'
                }`}
              >
                {enforceRoleVotes ? '🗳 Role Proposals: ON' : '🗳 Role Proposals: OFF'}
              </button>
              <span className={activeOwnsSlot ? 'font-semibold text-ok' : 'font-semibold text-warn'}>
                {activeOwnsSlot
                  ? '✓ Direct Edit Authority (within limits)'
                  : '⚠ Cross-Role Domain'}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Contract drawer if toggled */}
      {requirementsOpen && (
        <div
          className="hud-enter pointer-events-auto mt-2 rounded-2xl border border-line bg-panel p-4 backdrop-blur"
          role="region"
          aria-label="Mission contract checklist"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Mission Requirements</p>
            <button
              type="button"
              onClick={() => assemblyStore.getState().setRequirementsOpen(false)}
              className="text-xs font-semibold text-muted hover:text-ink"
            >
              Hide
            </button>
          </div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {contract.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-black/25 px-3 py-2 text-xs">
                <span className="font-bold text-ink">
                  {item.icon} {item.label}
                </span>
                <span className="mt-0.5 block text-muted">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decision Log drawer if toggled */}
      {decisionLogOpen && (
        <div className="mt-2">
          <DecisionLog
            crew={crew}
            decisionLog={decisionLog}
            onClose={() => setDecisionLogOpen(false)}
          />
        </div>
      )}

      {/* Middle Area: Left SlotList · Centre 3D Viewport + VotePanel/Bark/TradeOff · Right Resource HUD */}
      <div className="my-3 grid flex-1 grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <SlotList
            design={activeDesign}
            mission={mission}
            selectedTarget={selectedTarget}
            onSelectTarget={(target) => assemblyStore.getState().selectTarget(target)}
            onChangeOption={(key, value) => handleDesignChange({ kind: 'option', key, value })}
          />
        </div>

        <div className="pointer-events-auto flex flex-col justify-end gap-2 self-end lg:col-span-5">
          {activeVote ? (
            <VotePanel
              session={activeVote}
              onAcknowledgeHandoff={() => acknowledgeVoteHandoff()}
              onToggleHandoffMode={(useHandoff) => setVoteHandoff(useHandoff)}
              onCastVote={(memberId, optId, reaction) => submitMemberVote(memberId, optId, reaction)}
              onBreakTie={(optId) => breakVoteTie(optId)}
              onCancel={() => cancelActiveVote()}
            />
          ) : (
            <>
              <TradeOffPopup entry={latestDecision} />
              <EngineerBark summary={summary} mission={mission} />
            </>
          )}
        </div>

        <div className="space-y-2.5 lg:col-span-4">
          <ResourcePanel summary={summary} mission={mission} before={previousSummary} title="Live Resource HUD" />
          <div className="pointer-events-auto rounded-xl border border-line bg-panel px-3.5 py-2.5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted">Critical for {mission.pathway.name}:</span>
              <div className="flex flex-wrap gap-1.5">
                {mission.pathway.critical.map((crit) => (
                  <span key={crit} className="rounded border border-warn/60 bg-warn/10 px-2 py-0.5 font-semibold text-warn">
                    ★ {crit.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Area: Part Browser Drawer */}
      <PartBrowser
        selectedTarget={selectedTarget}
        design={activeDesign}
        mission={mission}
        onEdit={(change) => handleDesignChange(change)}
      />

      {/* Modal: Physics Design Calculator */}
      {calculatorOpen && (
        <DesignCalculator
          summary={summary}
          mission={mission}
          onClose={() => assemblyStore.getState().setCalculatorOpen(false)}
          onApplyFuel={(fuelMass) => handleDesignChange({ kind: 'option', key: 'fuelMass', value: fuelMass })}
          onApplySpinArm={(spinArmLength) => handleDesignChange({ kind: 'option', key: 'spinArmLength', value: spinArmLength })}
        />
      )}
    </div>
  );
}
