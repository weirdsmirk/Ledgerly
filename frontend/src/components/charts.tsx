import { useState } from 'react';
import { money } from '../types';

export interface DonutSlice {
  key: string;
  label: string;
  icon: string;
  color: string;
  value: number;
}

export function DonutChart({ slices, centerLabel, centerValue, showLegend = true }: { slices: DonutSlice[]; centerLabel: string; centerValue: string; showLegend?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 40;
  const C = 2 * Math.PI * R;
  let offset = 0;

  if (total <= 0) {
    return (
      <div className="donut-wrap">
        <div className="donut-box">
          <svg viewBox="0 0 100 100" className="donut">
            <circle cx="50" cy="50" r={R} fill="none" stroke="#e6ebe7" strokeWidth="13" />
          </svg>
          <div className="donut-center">
            <span className="donut-center-value">$0</span>
            <span className="donut-center-label">no data</span>
          </div>
        </div>
      </div>
    );
  }

  const hovered = active !== null ? slices[active] : null;

  return (
    <div className="donut-wrap">
      <div className="donut-box">
        <svg viewBox="0 0 100 100" className="donut">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#eef2ee" strokeWidth="13" />
        {slices.map((s, i) => {
          const frac = s.value / total;
          const len = frac * C;
          const dash = `${Math.max(len - 1.2, 0.5)} ${C - Math.max(len - 1.2, 0.5)}`;
          const el = (
            <circle
              key={s.key}
              cx="50" cy="50" r={R} fill="none"
              stroke={s.color}
              strokeWidth={active === i ? 15 : 13}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{ opacity: active === null || active === i ? 1 : 0.35, transition: 'opacity 0.12s ease' }}
            />
          );
          offset += len;
          return el;
        })}
        </svg>
        <div className="donut-center">
          <span className="donut-center-value">
            {hovered ? money(hovered.value, 0) : centerValue}
          </span>
          <span className="donut-center-label">
            {hovered ? hovered.label : centerLabel}
          </span>
        </div>
      </div>
      {showLegend && (
        <ul className="cat-legend">
          {slices.map((s, i) => (
            <li key={s.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
              <span className="dot-swatch" style={{ background: s.color }} />
              <span className="cat-name">{s.label}</span>
              <span className="cat-amount">{money(s.value, 0)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Smooth two-series area chart: income (green) + expenses (amber). */
export function AreaChart({
  labels,
  series,
  yFormat = (v: number) => `$${(v / 1000).toFixed(1)}k`,
  height = 300,
}: {
  labels: string[];
  series: Array<{ label: string; color: string; fill: string; values: number[] }>;
  yFormat?: (v: number) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const PAD = { top: 14, right: 8, bottom: 30, left: 52 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = Math.max(1, labels.length);
  const x = (i: number) => PAD.left + (n === 1 ? (W - PAD.left - PAD.right) / 2 : (i / (n - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);

  const line = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const area = (vals: number[]) =>
    `${line(vals)} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const gid = `ag${series.map((s) => s.color.replace('#', '')).join('')}`;

  return (
    <div className="areachart">
      <svg viewBox={`0 0 ${W} ${H}`} className="areachart-svg" onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`${gid}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="#edf1ed" />
            <text x={PAD.left - 9} y={y(max * t) + 4} textAnchor="end" className="chart-axis">
              {yFormat(max * t)}
            </text>
          </g>
        ))}
        {series.map((s, si) => (
          <path key={si} d={area(s.values)} fill={`url(#${gid}-${si})`} />
        ))}
        {series.map((s, si) => (
          <path key={si} d={line(s.values)} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" className="areachart-line" />
        ))}
        {hover !== null && hover < n && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="#c9d4cb" strokeDasharray="4 3" />
            {series.map((s, si) => (
              <circle key={si} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill="#fff" stroke={s.color} strokeWidth={2.4} />
            ))}
          </g>
        )}
        {labels.map((l, i) => (
          ((n > 8 && i % Math.ceil(n / 6) !== 0 && i !== n - 1) ? null : (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="chart-axis">{l}</text>
          ))
        ))}
        {labels.map((_, i) => (
          <rect key={`h${i}`} x={x(i) - (W / n / 2)} y={PAD.top} width={W / n} height={H - PAD.top - PAD.bottom} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && labels[hover] && (
        <div className="chart-tooltip" style={{ display: 'block' }}>
          <div className="tip-title">{labels[hover]}</div>
          {series.map((s, si) => (
            <div className="tip-row" key={si}>
              <span className="tip-swatch" style={{ background: s.color }} />
              {s.label}
              <strong>{money(s.values[hover] ?? 0, 0)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Grouped vertical bars — e.g. income vs expenses per month. */
export function GroupedBars({
  groups,
  seriesMeta,
  valueFormatter = (v: number) => money(v, 0),
  height = 300,
}: {
  groups: Array<{ label: string; values: number[] }>;
  seriesMeta: Array<{ name: string; color: string }>;
  valueFormatter?: (v: number) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const PAD = { top: 16, right: 10, bottom: 30, left: 56 };
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  const k = seriesMeta.length;
  const slot = (W - PAD.left - PAD.right) / Math.max(1, groups.length);
  const bw = Math.min(44, (slot * 0.62) / Math.max(1, k));

  return (
    <div className="barchart">
      <svg viewBox={`0 0 ${W} ${H}`} className="barchart-svg" onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom)} y2={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom)} stroke="#edf1ed" />
            <text x={PAD.left - 9} y={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom) + 4} textAnchor="end" className="chart-axis">
              {valueFormatter(max * f)}
            </text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = PAD.left + gi * slot + slot / 2;
          const totalW = bw * k + 8 * (k - 1);
          return g.values.map((v, si) => {
            const h = (v / max) * (H - PAD.top - PAD.bottom);
            const bx = cx - totalW / 2 + si * (bw + 8);
            return (
              <rect
                key={`${gi}-${si}`}
                x={bx}
                y={PAD.top + (H - PAD.top - PAD.bottom) - h}
                width={bw}
                height={Math.max(h, v > 0 ? 3 : 0)}
                rx={4}
                fill={seriesMeta[si]?.color ?? '#3f8f63'}
                opacity={hover === null || hover === gi ? 1 : 0.35}
                className="barchart-bar"
                onMouseEnter={() => setHover(gi)}
              />
            );
          });
        })}
        {groups.map((g, gi) => (
          <text key={gi} x={PAD.left + gi * slot + slot / 2} y={H - 8} textAnchor="middle" className="chart-axis">
            {g.label}
          </text>
        ))}
      </svg>
      <div className="chart-legend-h">
        {seriesMeta.map((m) => (
          <span key={m.name} className="legend-h-item">
            <span className="tip-swatch" style={{ background: m.color }} />
            {m.name}
          </span>
        ))}
      </div>
      {hover !== null && groups[hover] && (
        <div className="chart-tooltip" style={{ display: 'block' }}>
          <div className="tip-title">{groups[hover].label}</div>
          {seriesMeta.map((m, si) => (
            <div className="tip-row" key={m.name}>
              <span className="tip-swatch" style={{ background: m.color }} />
              {m.name}
              <strong>{valueFormatter(groups[hover].values[si] ?? 0)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Single-series bars — budget history plates. */
export function BarChart({ data, color = '#3f8f63', valueFormatter = (v: number) => money(v, 0), height = 200 }: {
  data: Array<{ label: string; value: number; count?: number }>;
  color?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const PAD = { top: 16, right: 10, bottom: 28, left: 56 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - PAD.left - PAD.right) / Math.max(1, data.length);
  return (
    <div className="barchart">
      <svg viewBox={`0 0 ${W} ${H}`} className="barchart-svg" onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom)} y2={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom)} stroke="#edf1ed" />
            <text x={PAD.left - 9} y={PAD.top + (1 - f) * (H - PAD.top - PAD.bottom) + 4} textAnchor="end" className="chart-axis">
              {valueFormatter(max * f)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - PAD.top - PAD.bottom);
          const x = PAD.left + i * bw + bw * 0.22;
          const w = bw * 0.56;
          return (
            <rect
              key={i} x={x} y={PAD.top + (H - PAD.top - PAD.bottom) - h}
              width={w} height={Math.max(h, d.value > 0 ? 3 : 0)} rx={4}
              fill={color} opacity={hover === null || hover === i ? 1 : 0.4}
              className="barchart-bar" onMouseEnter={() => setHover(i)}
            />
          );
        })}
        {data.map((d, i) => (
          <text key={i} x={PAD.left + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="chart-axis">{d.label}</text>
        ))}
      </svg>
      {hover !== null && data[hover] && (
        <div className="chart-tooltip" style={{ display: 'block' }}>
          <div className="tip-title">{data[hover].label}</div>
          <div className="tip-row"><strong>{valueFormatter(data[hover].value)}</strong></div>
          {data[hover].count !== undefined && <div className="tip-sub">{data[hover].count} transactions</div>}
        </div>
      )}
    </div>
  );
}
