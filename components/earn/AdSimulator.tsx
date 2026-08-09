"use client";

import { useEffect, useState } from "react";

const AD_DURATION_SECONDS = 5;

export default function AdSimulator({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const done = secondsLeft <= 0;
  const progress = ((AD_DURATION_SECONDS - secondsLeft) / AD_DURATION_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-6">
      <div className="w-full max-w-sm rounded-sm bg-paper p-6 text-center">
        <p className="font-mono text-xs text-fog">simulated ad</p>
        <div className="mt-6 flex h-40 items-center justify-center rounded-sm border border-dashed border-line">
          <p className="font-display text-lg italic text-fog">
            {done ? "ad finished" : `imagine a rewarded video here`}
          </p>
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-ink transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          {!done ? (
            <>
              <span className="font-mono text-xs text-fog">
                skip in {secondsLeft}s
              </span>
              <button
                onClick={onCancel}
                className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink"
              >
                cancel
              </button>
            </>
          ) : (
            <button
              onClick={onComplete}
              className="mx-auto font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
            >
              continue → claim spin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
