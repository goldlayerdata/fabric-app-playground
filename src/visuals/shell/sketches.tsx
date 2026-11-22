// The drawings of the Power BI visuals: one glyph per visual, used large in the field-well sketch
// and small on the landing tiles. Shapes only, no numbers.
import type { ReactNode } from 'react';

/** A pie or ring slice from angle a0 to a1 (degrees, clockwise from 12 o'clock). */
function wedge(cx: number, cy: number, r: number, a0: number, a1: number, r0 = 0) {
  const p = (radius: number, a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(cx + radius * Math.cos(t)).toFixed(1)} ${(cy + radius * Math.sin(t)).toFixed(1)}`;
  };
  const big = a1 - a0 > 180 ? 1 : 0;
  return r0
    ? `M${p(r, a0)} A${r} ${r} 0 ${big} 1 ${p(r, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${big} 0 ${p(r0, a0)} Z`
    : `M${cx} ${cy} L${p(r, a0)} A${r} ${r} 0 ${big} 1 ${p(r, a1)} Z`;
}
const SLICES: [number, number, string][] = [[0, 150, 'sk-bar'], [150, 235, 'sk-bar2'], [235, 300, 'sk-label'], [300, 360, 'sk-bar3']];
const COLUMNS = [34, 66, 88, 92];
const TREND = '10,84 34,70 58,76 82,50 106,58 130,34 154,42 190,18';

const GLYPHS: Record<string, ReactNode> = {
  bar: [150, 60, 46, 42, 35, 18, 11, 4].map((w, i) => <g key={i}><rect x="4" y={6 + i * 12.5} width="34" height="5" rx="2" className="sk-label" /><rect x="44" y={4 + i * 12.5} width={w} height="9" rx="1.5" className="sk-bar" /></g>),
  slicer: <><text x="10" y="18" className="sk-text">Year</text><rect x="10" y="26" width="110" height="20" rx="3" className="sk-box" /><text x="18" y="40" className="sk-text">All</text><path d="M104 33l5 5 5-5" className="sk-line" /></>,
  'key-influencers': <><text x="8" y="16" className="sk-text">What influences Revenue to increase</text>{[0, 1, 2].map((i) => <g key={i}><circle cx="22" cy={36 + i * 24} r="9" className="sk-box" /><rect x="38" y={33 + i * 24} width={60 - i * 12} height="6" rx="2" className="sk-label" /></g>)}<rect x="120" y="30" width="16" height="60" className="sk-bar" /><rect x="144" y="52" width="16" height="38" className="sk-bar" /><rect x="168" y="62" width="16" height="28" className="sk-bar" /><path d="M116 70 L190 70" className="sk-dash" /></>,
  column: <>{COLUMNS.map((h, i) => <rect key={i} x={22 + i * 44} y={100 - h} width="26" height={h} rx="1.5" className="sk-bar" />)}<path d="M8 100 L194 100" className="sk-line" /></>,
  line: <><polyline points={TREND} className="sk-stroke" /><path d="M8 100 L194 100" className="sk-line" /></>,
  area: <><polygon points={`10,100 ${TREND} 190,100`} className="sk-area" /><polyline points={TREND} className="sk-stroke" /><path d="M8 100 L194 100" className="sk-line" /></>,
  combo: <>{COLUMNS.map((h, i) => <rect key={i} x={22 + i * 44} y={100 - h} width="26" height={h} rx="1.5" className="sk-bar" />)}<polyline points="35,58 79,40 123,22 167,14" className="sk-stroke2" />{[[35, 58], [79, 40], [123, 22], [167, 14]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.5" className="sk-dot2" />)}<path d="M8 100 L194 100" className="sk-line" /></>,
  pie: SLICES.map(([a0, a1, c]) => <path key={a0} d={wedge(100, 55, 48, a0, a1)} className={`${c} sk-cut`} />),
  donut: SLICES.map(([a0, a1, c]) => <path key={a0} d={wedge(100, 55, 48, a0, a1, 26)} className={`${c} sk-cut`} />),
  scatter: <>{[[30, 82], [52, 70], [60, 86], [84, 60], [100, 66], [124, 44], [150, 30], [176, 16], [70, 50]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" className="sk-bar" />)}<path d="M10 6 L10 100 L194 100" className="sk-line" /></>,
  treemap: <><rect x="6" y="6" width="104" height="98" className="sk-bar sk-cut" /><rect x="110" y="6" width="84" height="54" className="sk-bar2 sk-cut" /><rect x="110" y="60" width="48" height="44" className="sk-label sk-cut" /><rect x="158" y="60" width="36" height="26" className="sk-bar3 sk-cut" /><rect x="158" y="86" width="36" height="18" className="sk-bar sk-cut" /></>,
  funnel: [170, 132, 104, 80, 52, 30, 14].map((w, i) => <rect key={i} x={100 - w / 2} y={5 + i * 14.5} width={w} height="11" rx="1.5" className="sk-bar" />),
  waterfall: <>{[[0, 34], [34, 22], [56, 14], [70, 10], [80, 8]].map(([start, size], i) => <rect key={i} x={14 + i * 31} y={100 - start - size} width="20" height={size} rx="1.5" className="sk-bar" />)}<rect x="169" y="12" width="20" height="88" rx="1.5" className="sk-bar2" /><path d="M8 100 L194 100" className="sk-line" /></>,
  ribbon: <><polygon points="44,100 44,62 92,44 92,100" className="sk-area" /><polygon points="44,62 44,40 92,22 92,44" className="sk-area2" /><polygon points="112,100 112,60 160,34 160,100" className="sk-area2" /><polygon points="112,60 112,22 160,12 160,34" className="sk-area" />{[[24, 62, 40], [92, 44, 22], [160, 34, 12]].map(([x, split, top], i) => <g key={x}><rect x={x} y={split} width="20" height={100 - split} className={i === 2 ? 'sk-bar2' : 'sk-bar'} /><rect x={x} y={top} width="20" height={split - top} className={i === 2 ? 'sk-bar' : 'sk-bar2'} /></g>)}<path d="M8 100 L194 100" className="sk-line" /></>,
  gauge: <><path d={wedge(100, 96, 80, -90, 90, 52)} className="sk-label" /><path d={wedge(100, 96, 80, -90, 12, 52)} className="sk-bar" /><rect x="78" y="78" width="44" height="12" rx="3" className="sk-label" /></>,
  card: <><rect x="40" y="30" width="120" height="30" rx="5" className="sk-bar" /><rect x="72" y="70" width="56" height="9" rx="3" className="sk-label" /></>,
  kpi: <><polygon points="6,104 6,84 54,70 102,76 150,46 194,40 194,104" className="sk-area" /><rect x="46" y="28" width="108" height="28" rx="5" className="sk-bar" /><rect x="76" y="64" width="48" height="8" rx="3" className="sk-label" /></>,
  table: <>{[0, 1, 2, 3, 4, 5].map((r) => <g key={r}><rect x="8" y={8 + r * 16} width="70" height="9" rx="2" className={r ? 'sk-label' : 'sk-bar'} /><rect x="96" y={8 + r * 16} width="40" height="9" rx="2" className={r ? 'sk-label' : 'sk-bar'} /><rect x="152" y={8 + r * 16} width="40" height="9" rx="2" className={r ? 'sk-label' : 'sk-bar'} /></g>)}</>,
  matrix: <>{[0, 1, 2, 3, 4, 5].map((r) => <g key={r}><rect x="8" y={8 + r * 16} width="52" height="9" rx="2" className={r ? 'sk-bar2' : 'sk-none'} />{[0, 1, 2, 3].map((c) => <rect key={c} x={70 + c * 32} y={8 + r * 16} width="24" height="9" rx="2" className={r ? 'sk-label' : 'sk-bar'} />)}</g>)}</>,
  'decomposition-tree': <><rect x="6" y="48" width="40" height="12" rx="2" className="sk-bar" />{[20, 50, 80].map((y, i) => <g key={y}><path d={`M46 54 C58 54 58 ${y + 5} 70 ${y + 5}`} className="sk-line" /><rect x="70" y={y} width={48 - i * 12} height="10" rx="2" className="sk-bar" /></g>)}{[8, 28, 48].map((y, i) => <g key={y}><path d={`M118 25 C132 25 132 ${y + 5} 146 ${y + 5}`} className="sk-line" /><rect x="146" y={y} width={44 - i * 12} height="10" rx="2" className="sk-bar2" /></g>)}</>,
  'azure-map': <><rect x="6" y="6" width="188" height="98" rx="6" className="sk-box" /><path d="M20 40 Q40 20 66 30 T96 44 Q84 70 60 66 T28 60 Z" className="sk-label" /><path d="M112 26 Q140 14 170 28 T176 62 Q150 82 126 66 T112 26 Z" className="sk-label" /><circle cx="50" cy="46" r="11" className="sk-bar" /><circle cx="140" cy="44" r="7" className="sk-bar" /><circle cx="160" cy="58" r="4" className="sk-bar" /><circle cx="76" cy="54" r="3" className="sk-bar" /></>,
};

/** The glyph for a visual, as the children of an <svg viewBox="0 0 200 110">. */
export function Glyph({ id }: { id: string }) {
  return <>{GLYPHS[id] ?? null}</>;
}
