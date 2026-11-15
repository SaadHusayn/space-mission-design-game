'use client';

import { AVATAR_COLOURS, ROLES, type CrewMember } from '@/game/core/crew';

import { Button } from './Button';

export interface HotseatHandoffProps {
  member: CrewMember;
  voterIndex: number;
  totalVoters: number;
  proposalTitle: string;
  onReady: () => void;
  onDisableHandoff?: () => void;
}

/**
 * Pass-the-device curtain for local hot-seat multiplayer (2–4 players).
 * Shows a prominent role-coloured banner so it is unmistakable whose turn it is.
 */
export function HotseatHandoff({
  member,
  voterIndex,
  totalVoters,
  proposalTitle,
  onReady,
  onDisableHandoff,
}: HotseatHandoffProps) {
  const primaryRole = ROLES[member.roles[0] ?? 'commander'];
  const callSign = member.callSign || `Astronaut ${voterIndex + 1}`;

  return (
    <div
      className="rounded-2xl border-2 p-5 text-center shadow-2xl backdrop-blur"
      style={{
        borderColor: primaryRole.colour,
        background: `linear-gradient(135deg, ${primaryRole.colour}22, rgba(7, 11, 22, 0.96))`,
      }}
      role="region"
      aria-label={`Pass device to ${callSign}`}
    >
      <p
        className="font-mono text-xs font-bold uppercase tracking-[0.24em]"
        style={{ color: primaryRole.colour }}
      >
        Hot-Seat Turn {voterIndex + 1} of {totalVoters} · Pass the Device
      </p>

      <div className="mt-3 flex flex-col items-center justify-center gap-2">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-extrabold text-space shadow-lg"
          style={{
            backgroundColor: AVATAR_COLOURS[member.avatar % AVATAR_COLOURS.length],
            borderColor: primaryRole.colour,
          }}
          aria-hidden
        >
          {callSign.slice(0, 2).toUpperCase()}
        </span>
        <h4 className="text-xl font-extrabold text-ink">{callSign}</h4>
        <div className="flex flex-wrap justify-center gap-1.5">
          {member.roles.map((roleId) => {
            const role = ROLES[roleId];
            return (
              <span
                key={roleId}
                className="rounded-md border px-2 py-0.5 font-mono text-xs font-bold"
                style={{
                  borderColor: role.colour,
                  color: role.colour,
                  backgroundColor: `${role.colour}18`,
                }}
              >
                {role.short} · {role.name}
              </span>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Voting on: <strong className="text-ink">{proposalTitle}</strong>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        <Button onClick={onReady}>I HAVE THE DEVICE — VOTE NOW</Button>
        {onDisableHandoff && (
          <button
            type="button"
            onClick={onDisableHandoff}
            className="rounded-xl border border-line bg-black/40 px-3 py-2 font-mono text-xs text-muted transition hover:border-accent hover:text-ink"
          >
            Switch to Shared Screen (No Curtain)
          </button>
        )}
      </div>
    </div>
  );
}
