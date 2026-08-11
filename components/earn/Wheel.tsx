"use client";

import { useState } from "react";
import { PRIZES } from "@/lib/earn/prizes";

const SIZE = 320;
const RADIUS = SIZE / 2;
const SLICE_ANGLE = 360 / PRIZES.length;

function polarToCartesian(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: RADIUS + r * Math.cos(rad), y: RADIUS + r * Math.sin(rad) };
}

function slicePath(index: number) {
  const start = index * SLICE_ANGLE;
  const end = start + SLICE_ANGLE;
  const p1 = polarToCartesian(start, RADIUS);
  const p2 = polarToCartesian(end, RADIUS);
  const largeArc = SLICE_ANGLE > 180 ? 1 : 0;
  return `M ${RADIUS} ${RADIUS} L ${p1.x} ${p1.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
}

export default function Wheel({
  spinning,
  targetIndex,
  onSpinEnd,
}: {
  spinning: boolean;
  targetIndex: number | null;
  onSpinEnd: () => void;
}) {
  const [rotation, setRotation] = useState(0);

  // Pointer is fixed at the top (12 o'clock / 0deg). To land slice i's
  // center under it, rotate so that: (sliceCenter + rotation) % 360 === 0.
  // Add a few full spins on top purely for visual effect.
  function computeTargetRotation(index: number) {
    const sliceCenter = index * SLICE_ANGLE + SLICE_ANGLE / 2;
    const extraSpins = 6 * 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = ((360 - sliceCenter - currentMod) % 360 + 360) % 360;
    return rotation + extraSpins + delta;
  }

  // Re-derive rotation whenever a new target comes in.
  const [lastTarget, setLastTarget] = useState<number | null>(null);
  if (spinning && targetIndex !== null && targetIndex !== lastTarget) {
    setLastTarget(targetIndex);
    setRotation(computeTargetRotation(targetIndex));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* pointer */}
        <div className="absolute left-1/2 top-[-10px] z-10 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-ink" />

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4.5s cubic-bezier(0.15, 0.85, 0.25, 1)" : "none",
          }}
          onTransitionEnd={() => {
            if (spinning) onSpinEnd();
          }}
        >
          <circle cx={RADIUS} cy={RADIUS} r={RADIUS - 1} fill="#FAFAF7" stroke="#E4E2DC" />
          {PRIZES.map((prize, i) => {
            const mid = i * SLICE_ANGLE + SLICE_ANGLE / 2;
            const labelPos = polarToCartesian(mid, RADIUS * 0.62);
            return (
              <g key={prize.id}>
                <path d={slicePath(i)} fill={prize.color} stroke="#FAFAF7" strokeWidth={1.5} />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="#FAFAF7"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                  transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                >
                  {prize.label}
                </text>
              </g>
            );
          })}
          <circle cx={RADIUS} cy={RADIUS} r={18} fill="#161513" />
        </svg>
      </div>
    </div>
  );
}
