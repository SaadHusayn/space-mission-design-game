import type { MissionPatch as Patch } from '@/game/core/patch';

const SYMBOLS: Record<Patch['symbol'], React.ReactNode> = {
  rocket: (
    <g fill="#f4f6fa">
      <path d="M50 18 C58 28 60 42 58 58 L42 58 C40 42 42 28 50 18 Z" />
      <path d="M42 50 L34 62 L42 60 Z M58 50 L66 62 L58 60 Z" fill="#ffb547" />
      <circle cx="50" cy="38" r="4" fill="#1c2b45" />
      <path d="M45 60 L50 72 L55 60 Z" fill="#ff8a3d" />
    </g>
  ),
  planet: (
    <g>
      <circle cx="50" cy="46" r="15" fill="#f4f6fa" />
      <ellipse cx="50" cy="46" rx="27" ry="7" fill="none" stroke="#ffb547" strokeWidth="3" transform="rotate(-18 50 46)" />
    </g>
  ),
  star: <polygon fill="#f4f6fa" points="50,22 56,40 75,40 60,51 66,70 50,58 34,70 40,51 25,40 44,40" />,
  orbit: (
    <g>
      <circle cx="50" cy="46" r="9" fill="#5ce1ff" />
      <ellipse cx="50" cy="46" rx="25" ry="12" fill="none" stroke="#f4f6fa" strokeWidth="2.5" />
      <circle cx="74" cy="44" r="4" fill="#f4f6fa" />
    </g>
  ),
  telescope: (
    <g fill="#f4f6fa">
      <rect x="32" y="34" width="34" height="12" rx="3" transform="rotate(-25 50 40)" />
      <path d="M48 46 L40 68 M52 46 L60 68" stroke="#f4f6fa" strokeWidth="3" />
      <circle cx="70" cy="24" r="2.5" />
      <circle cx="78" cy="34" r="1.8" />
    </g>
  ),
};

function Shape({ shape, colour }: { shape: Patch['shape']; colour: string }) {
  const common = { fill: colour, stroke: '#ffb547', strokeWidth: 3 };
  if (shape === 'shield') return <path d="M50 4 L90 16 L86 60 Q80 84 50 96 Q20 84 14 60 L10 16 Z" {...common} />;
  if (shape === 'hexagon') return <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" {...common} />;
  return <circle cx="50" cy="50" r="46" {...common} />;
}

/** The crew's mission patch, drawn as SVG. */
export function MissionPatch({ patch, size = 120, label = 'Mission patch' }: { patch: Patch; size?: number; label?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${label}: ${patch.symbol} on a ${patch.shape}, motto "${patch.motto}"`}>
      <Shape shape={patch.shape} colour={patch.colour} />
      {SYMBOLS[patch.symbol]}
      <text x="50" y="86" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#f4f6fa" letterSpacing="0.6">
        {patch.motto.toUpperCase()}
      </text>
      <text x="50" y="13.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="#ffb547" letterSpacing="1.2">
        OEA
      </text>
    </svg>
  );
}
