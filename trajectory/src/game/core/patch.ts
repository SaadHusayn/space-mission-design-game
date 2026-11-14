/** Mission patch: a small badge the crew designs at graduation. */

export const PATCH_SHAPES = ['circle', 'shield', 'hexagon'] as const;
export const PATCH_SYMBOLS = ['rocket', 'planet', 'star', 'orbit', 'telescope'] as const;
export const PATCH_COLOURS = ['#1d4ed8', '#7c3aed', '#b91c1c', '#0f766e', '#c2410c', '#334155'] as const;

export interface MissionPatch {
  shape: (typeof PATCH_SHAPES)[number];
  symbol: (typeof PATCH_SYMBOLS)[number];
  colour: (typeof PATCH_COLOURS)[number];
  /** Short motto, at most 24 characters. */
  motto: string;
}

export const DEFAULT_PATCH: MissionPatch = { shape: 'circle', symbol: 'rocket', colour: '#1d4ed8', motto: 'Ad astra' };

export function sanitisePatch(value: unknown): MissionPatch {
  const input = (value ?? {}) as Partial<MissionPatch>;
  return {
    shape: PATCH_SHAPES.includes(input.shape as MissionPatch['shape']) ? (input.shape as MissionPatch['shape']) : DEFAULT_PATCH.shape,
    symbol: PATCH_SYMBOLS.includes(input.symbol as MissionPatch['symbol']) ? (input.symbol as MissionPatch['symbol']) : DEFAULT_PATCH.symbol,
    colour: PATCH_COLOURS.includes(input.colour as MissionPatch['colour']) ? (input.colour as MissionPatch['colour']) : DEFAULT_PATCH.colour,
    motto: typeof input.motto === 'string' ? input.motto.trim().slice(0, 24) : DEFAULT_PATCH.motto,
  };
}
