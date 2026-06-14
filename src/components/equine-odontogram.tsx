import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  UPPER_RIGHT, UPPER_LEFT, LOWER_RIGHT, LOWER_LEFT,
  STATUS_COLOR, STATUS_LABEL, toothKind, type ToothStatus,
} from "@/lib/triadan";

export interface ToothState {
  tooth_number: number;
  status: ToothStatus;
  procedure?: string | null;
  notes?: string | null;
}

interface Props {
  teeth: Record<number, ToothState>;
  onSelect: (toothNumber: number) => void;
  selected?: number | null;
}

const TOOTH_W = 30;
const TOOTH_H = 44;
const GAP = 4;

function Tooth({
  n, state, onClick, isSelected,
}: { n: number; state?: ToothState; onClick: () => void; isSelected: boolean }) {
  const kind = toothKind(n);
  const status = state?.status ?? "sadio";
  const fill = STATUS_COLOR[status];
  const radius = kind === "incisivo" ? 6 : kind === "canino" ? 4 : 3;
  const w = kind === "molar" ? TOOTH_W + 4 : kind === "lobo" ? TOOTH_W - 10 : TOOTH_W;

  return (
    <g
      onClick={onClick}
      className="cursor-pointer transition-transform hover:scale-110"
      style={{ transformOrigin: "center" }}
    >
      <rect
        width={w} height={TOOTH_H} rx={radius}
        fill={fill}
        stroke={isSelected ? "#a78bfa" : "rgba(255,255,255,0.12)"}
        strokeWidth={isSelected ? 2.5 : 1}
      />
      <text
        x={w / 2} y={TOOTH_H / 2 + 4}
        textAnchor="middle"
        fontSize="10" fontWeight="600"
        fill="white" opacity={0.9}
      >{n}</text>
      {status !== "sadio" && (
        <circle cx={w - 5} cy={5} r={3} fill="white" />
      )}
    </g>
  );
}

function Row({
  numbers, teeth, onSelect, selected, y, reverse = false,
}: {
  numbers: number[]; teeth: Record<number, ToothState>;
  onSelect: (n: number) => void; selected: number | null;
  y: number; reverse?: boolean;
}) {
  const list = reverse ? [...numbers].reverse() : numbers;
  let x = 0;
  return (
    <>
      {list.map((n) => {
        const kind = toothKind(n);
        const w = kind === "molar" ? TOOTH_W + 4 : kind === "lobo" ? TOOTH_W - 10 : TOOTH_W;
        const tx = x;
        x += w + GAP;
        return (
          <g key={n} transform={`translate(${tx}, ${y})`}>
            <Tooth n={n} state={teeth[n]} onClick={() => onSelect(n)} isSelected={selected === n} />
          </g>
        );
      })}
    </>
  );
}

export function EquineOdontogram({ teeth, onSelect, selected = null }: Props) {
  const [zoom, setZoom] = useState(1);

  const upper = useMemo(() => [...UPPER_RIGHT, ...UPPER_LEFT], []);
  const lower = useMemo(() => [...LOWER_RIGHT, ...LOWER_LEFT], []);

  const rowWidth = (nums: number[]) =>
    nums.reduce((acc, n) => {
      const kind = toothKind(n);
      const w = kind === "molar" ? TOOTH_W + 4 : kind === "lobo" ? TOOTH_W - 10 : TOOTH_W;
      return acc + w + GAP;
    }, 0);

  const width = Math.max(rowWidth(upper), rowWidth(lower));
  const height = TOOTH_H * 2 + 60;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Sistema Triadan</span>
          <span>•</span>
          <span>Direita do paciente ◀ ▶ Esquerda</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">−</button>
          <span className="px-2 text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">+</button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="overflow-auto rounded-xl border border-border bg-gradient-to-b from-card/80 to-card/40 p-4 backdrop-blur"
      >
        <svg
          width={width * zoom}
          height={height * zoom}
          viewBox={`0 0 ${width} ${height}`}
          className="select-none"
        >
          {/* axis label */}
          <text x={width / 2} y={TOOTH_H + 22} textAnchor="middle" fontSize="9"
                fill="rgba(255,255,255,0.4)" fontWeight="600" letterSpacing="2">
            ARCADA SUPERIOR  ──  ARCADA INFERIOR
          </text>
          <line x1={0} y1={TOOTH_H + 12} x2={width} y2={TOOTH_H + 12}
                stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />

          <Row numbers={upper} teeth={teeth} onSelect={onSelect} selected={selected} y={0} />
          <Row numbers={lower} teeth={teeth} onSelect={onSelect} selected={selected} y={TOOTH_H + 30} />
        </svg>
      </motion.div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(STATUS_LABEL) as ToothStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-2 py-1">
            <span className="h-3 w-3 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
