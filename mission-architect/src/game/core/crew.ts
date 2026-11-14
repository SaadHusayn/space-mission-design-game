/**
 * Crew and roles. Up to four astronauts share one mission; with fewer
 * players, roles are merged so every responsibility is still covered.
 */

export const ROLE_IDS = ['commander', 'engineer', 'science', 'comms'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export interface RoleInfo {
  id: RoleId;
  name: string;
  /** Short label for badges. */
  short: string;
  /** Hex colour used for the role everywhere in the UI. */
  colour: string;
  /** What this role decides. */
  duties: string;
  /** Resources this role watches. */
  watches: string;
}

export const ROLES: Readonly<Record<RoleId, RoleInfo>> = {
  commander: {
    id: 'commander',
    name: 'Mission Commander',
    short: 'CDR',
    colour: '#5ce1ff',
    duties: 'Objective, trajectory, final GO / NO-GO, breaks tied votes',
    watches: 'Time and overall score',
  },
  engineer: {
    id: 'engineer',
    name: 'Flight Engineer',
    short: 'ENG',
    colour: '#ffb547',
    duties: 'Structure, power, batteries, attitude control, propulsion, rocket',
    watches: 'Mass and power',
  },
  science: {
    id: 'science',
    name: 'Science Specialist',
    short: 'SCI',
    colour: '#b48cff',
    duties: 'Instruments, observation targets, upgrades',
    watches: 'Science value and data',
  },
  comms: {
    id: 'comms',
    name: 'Comms & Resources Officer',
    short: 'COM',
    colour: '#4cf0a0',
    duties: 'Antenna, flight computer, budget approvals',
    watches: 'Budget and communications',
  },
};

export const MAX_CREW = 4;

/** Suit colour variants for avatars. */
export const AVATAR_COLOURS = ['#f2f4f8', '#ff8a3d', '#3d7bff', '#e8d44d', '#e85d75', '#3dd6b0'] as const;

export interface CrewMember {
  id: string;
  callSign: string;
  /** Index into AVATAR_COLOURS. */
  avatar: number;
  roles: RoleId[];
}

/** Which roles each player holds, for 1–4 players. */
export function defaultRoleAssignment(count: number): RoleId[][] {
  switch (count) {
    case 1:
      return [['commander', 'engineer', 'science', 'comms']];
    case 2:
      return [
        ['commander', 'science'],
        ['engineer', 'comms'],
      ];
    case 3:
      return [['commander', 'comms'], ['engineer'], ['science']];
    case 4:
      return [['commander'], ['engineer'], ['science'], ['comms']];
    default:
      throw new Error(`A crew has 1 to ${MAX_CREW} players, not ${count}`);
  }
}

export function createCrew(count: number, callSigns: readonly string[] = []): CrewMember[] {
  return defaultRoleAssignment(count).map((roles, index) => ({
    id: `p${index + 1}`,
    callSign: callSigns[index] ?? '',
    avatar: index % AVATAR_COLOURS.length,
    roles,
  }));
}

/** Passes every player's roles to the next player (so a team can swap who does what). */
export function rotateRoles(crew: readonly CrewMember[]): CrewMember[] {
  if (crew.length < 2) return crew.map((member) => ({ ...member, roles: [...member.roles] }));
  return crew.map((member, index) => ({ ...member, roles: [...crew[(index + crew.length - 1) % crew.length].roles] }));
}

/** Trims and collapses spaces. */
export function normaliseCallSign(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Returns an error message, or null if the call-sign is fine. */
export function validateCallSign(value: string, others: readonly string[] = []): string | null {
  const name = normaliseCallSign(value);
  if (name.length < 2) return 'Use at least 2 characters.';
  if (name.length > 16) return 'Use at most 16 characters.';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u.test(name)) return 'Use letters, numbers, spaces, hyphens or apostrophes.';
  if (others.some((other) => normaliseCallSign(other).toLowerCase() === name.toLowerCase())) return 'Another crew member already has this call-sign.';
  return null;
}

/** Every role covered exactly once and every call-sign valid and unique. */
export function isCrewValid(crew: readonly CrewMember[]): boolean {
  if (crew.length < 1 || crew.length > MAX_CREW) return false;
  const roles = crew.flatMap((member) => member.roles);
  if (roles.length !== ROLE_IDS.length || ROLE_IDS.some((role) => !roles.includes(role))) return false;
  return crew.every((member, index) =>
    validateCallSign(
      member.callSign,
      crew.filter((_, other) => other !== index).map((other) => other.callSign),
    ) === null,
  );
}

/** The crew member holding a role. */
export function holderOf(crew: readonly CrewMember[], role: RoleId): CrewMember | undefined {
  return crew.find((member) => member.roles.includes(role));
}
