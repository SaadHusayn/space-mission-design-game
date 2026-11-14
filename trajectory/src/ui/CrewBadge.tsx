import { AVATAR_COLOURS, ROLES, type CrewMember } from '@/game/core/crew';

/** One crew member: suit colour dot, call-sign and role badges. */
export function CrewBadge({ member }: { member: CrewMember }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-4 w-4 shrink-0 rounded-full border border-white/40" style={{ background: AVATAR_COLOURS[member.avatar] }} aria-hidden />
      <span className="font-semibold text-ink">{member.callSign || 'Unnamed'}</span>
      <span className="flex flex-wrap gap-1.5">
        {member.roles.map((role) => (
          <span key={role} className="rounded-md border px-1.5 py-0.5 text-xs font-bold tracking-[0.1em]" style={{ borderColor: ROLES[role].colour, color: ROLES[role].colour }} title={ROLES[role].name}>
            {ROLES[role].short}
          </span>
        ))}
      </span>
    </div>
  );
}
