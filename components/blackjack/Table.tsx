"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PlayingCard from "@/components/blackjack/Card";
import PlayerSeat from "@/components/blackjack/PlayerSeat";
import { getSeatPosition } from "@/components/blackjack/seatPositions";

type Card = { rank: string; suit: string };
type Hand = {
  playerId: string;
  seatIndex: number;
  cards: Card[];
  bet: number;
  doubled: boolean;
  status: string;
  total: number;
  result: string | null;
  payout: number | null;
};
type Player = { id: string; userId: string; displayName: string; seatIndex: number; balance: number };
type Round = {
  id: string;
  status: string;
  turnSeatIndex: number | null;
  dealerHand: Card[];
  dealerHoleRevealed: boolean;
  dealerTotal: number | null;
  dealerMessage: string | null;
  hands: Hand[];
};
type RoomState = { code: string; hostUserId: string; status: string; players: Player[]; round: Round | null };

const POLL_MS = 1500;

export default function BlackjackTable({ code }: { code: string }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [betInput, setBetInput] = useState("100");
  const [actionPending, setActionPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/blackjack/rooms/${code}/state`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load room");
        return;
      }
      setState(data.state);
      setYou(data.you);
      setError("");
    } catch {
      // transient network blip — next poll will retry, don't spam an error
    } finally {
      setLoaded(true);
    }
  }, [code]);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  async function call(path: string, body?: any) {
    setActionPending(true);
    try {
      const res = await fetch(`/api/blackjack/rooms/${code}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      await poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionPending(false);
    }
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-mono text-xs text-fog">loading table…</p>
      </main>
    );
  }

  if (error && !state) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-mono text-xs text-red-700">{error}</p>
        <a href="/blackjack" className="mt-4 inline-block font-mono text-xs text-ink underline">
          ← back to lobby
        </a>
      </main>
    );
  }

  if (!state) return null;

  const me = state.players.find((p) => p.userId === you);
  const isHost = state.hostUserId === you;
  const round = state.round;
  const myHand = round?.hands.find((h) => h.playerId === me?.id);
  const isMyTurn = !!me && round?.status === "player_turns" && round.turnSeatIndex === me.seatIndex;
  const noRoundActive = !round || round.status === "resolved";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <a href="/blackjack" className="font-mono text-xs text-fog transition hover:text-ink">
          ← lobby
        </a>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-fog">room</span>
          <span className="font-mono text-sm tracking-widest text-ink">{state.code}</span>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink"
          >
            copy link
          </button>
        </div>
      </div>

      {/* table — oval + perspective tilt on larger screens, simple stack on mobile */}
      <div className="mb-8 hidden sm:block">
        <div className="relative mx-auto" style={{ perspective: "1400px" }}>
          {/* decorative felt surface — purely visual, sits behind the
              upright dealer/seat content so buttons and text never
              get warped by the 3D transform */}
          <div
            className="pointer-events-none absolute inset-x-[6%] inset-y-[8%] rounded-[50%] shadow-2xl"
            style={{
              background: "radial-gradient(ellipse at 50% 35%, #232120 0%, #161513 70%)",
              transform: "rotateX(50deg)",
              transformOrigin: "center",
            }}
          />

          <div className="relative h-[420px] w-full">
            {/* dealer, head of the table */}
            <div className="absolute left-1/2 top-2 w-64 -translate-x-1/2 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fog">dealer</p>
              <div className="mt-2 flex justify-center gap-2">
                {round && round.status !== "betting" ? (
                  <>
                    {round.dealerHand.map((c, i) => (
                      <PlayingCard key={i} card={c} />
                    ))}
                    {!round.dealerHoleRevealed && <PlayingCard faceDown />}
                  </>
                ) : (
                  <p className="font-mono text-xs text-fog">waiting for the next round…</p>
                )}
              </div>
              {round?.dealerHoleRevealed && round.dealerTotal !== null && (
                <p className="mt-1.5 font-mono text-xs text-fog">{round.dealerTotal}</p>
              )}
              {round?.dealerMessage && (
                <p className="mt-3 font-display text-base italic text-ink">"{round.dealerMessage}"</p>
              )}
            </div>

            {/* seats around the oval */}
            {state.players.map((p) => {
              const hand = round?.hands.find((h) => h.playerId === p.id);
              const isTurn = round?.status === "player_turns" && round.turnSeatIndex === p.seatIndex;
              const isMe = p.userId === you;
              const pos = getSeatPosition(p.seatIndex, state.players.length);
              return (
                <div
                  key={p.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                >
                  <PlayerSeat player={p} hand={hand} isTurn={!!isTurn} isMe={isMe} isHost={p.userId === state.hostUserId} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* mobile: same info, plain stacked list — a tilted oval would
          just be cramped and hard to tap on a small screen */}
      <div className="mb-8 sm:hidden">
        <div className="rounded-lg bg-ink px-4 py-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40">dealer</p>
          <div className="mt-3 flex justify-center gap-2">
            {round && round.status !== "betting" ? (
              <>
                {round.dealerHand.map((c, i) => (
                  <PlayingCard key={i} card={c} />
                ))}
                {!round.dealerHoleRevealed && <PlayingCard faceDown />}
              </>
            ) : (
              <p className="font-mono text-xs text-paper/30">waiting for the next round…</p>
            )}
          </div>
          {round?.dealerHoleRevealed && round.dealerTotal !== null && (
            <p className="mt-2 font-mono text-xs text-paper/60">{round.dealerTotal}</p>
          )}
          {round?.dealerMessage && (
            <p className="mt-4 font-display text-lg italic text-paper/90">"{round.dealerMessage}"</p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {state.players.map((p) => {
            const hand = round?.hands.find((h) => h.playerId === p.id);
            const isTurn = round?.status === "player_turns" && round.turnSeatIndex === p.seatIndex;
            const isMe = p.userId === you;
            return (
              <PlayerSeat
                key={p.id}
                player={p}
                hand={hand}
                isTurn={!!isTurn}
                isMe={isMe}
                isHost={p.userId === state.hostUserId}
              />
            );
          })}
        </div>
      </div>

      {/* controls */}
      <div className="rounded-md border border-line p-4">
        {error && <p className="mb-3 font-mono text-xs text-red-700">{error}</p>}
        {!me ? (
          <button
            onClick={() => call("/join")}
            disabled={actionPending}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 hover:decoration-ink disabled:opacity-40"
          >
            sit down at this table
          </button>
        ) : noRoundActive ? (
          isHost ? (
            <button
              onClick={() => call("/start")}
              disabled={actionPending}
              className="font-mono text-xs text-ink underline decoration-line underline-offset-4 hover:decoration-ink disabled:opacity-40"
            >
              {round?.status === "resolved" ? "start next round" : "start round"}
            </button>
          ) : (
            <p className="font-mono text-xs text-fog">waiting for the host to start a round…</p>
          )
        ) : round?.status === "betting" ? (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              value={betInput}
              onChange={(e) => setBetInput(e.target.value)}
              className="w-24 border-b border-line bg-transparent py-1 font-mono text-sm outline-none focus:border-ink"
            />
            <button
              onClick={() => call("/bet", { amount: Number(betInput) })}
              disabled={actionPending}
              className="font-mono text-xs text-ink underline decoration-line underline-offset-4 hover:decoration-ink disabled:opacity-40"
            >
              {myHand ? "update bet" : "place bet"}
            </button>
            {isHost && (
              <button
                onClick={() => call("/deal")}
                disabled={actionPending}
                className="ml-auto font-mono text-xs text-ink underline decoration-line underline-offset-4 hover:decoration-ink disabled:opacity-40"
              >
                deal →
              </button>
            )}
          </div>
        ) : isMyTurn ? (
          <div className="flex gap-4">
            <button
              onClick={() => call("/action", { action: "hit" })}
              disabled={actionPending}
              className="font-mono text-xs text-ink underline decoration-line underline-offset-4 hover:decoration-ink disabled:opacity-40"
            >
              hit
            </button>
            <button
              onClick={() => call("/action", { action: "stand" })}
              disabled={actionPending}
              className="font-mono text-xs text-ink underline decoration-line underline-offset-4 hover:decoration-ink disabled:opacity-40"
            >
              stand
            </button>
            {myHand && myHand.cards.length === 2 && (
              <button
                onClick={() => call("/action", { action: "double" })}
                disabled={actionPending}
                className="font-mono text-xs text-ink underline decoration-line underline-offset-4 hover:decoration-ink disabled:opacity-40"
              >
                double
              </button>
            )}
          </div>
        ) : (
          <p className="font-mono text-xs text-fog">
            {round?.status === "player_turns" ? "waiting for other players…" : "dealer's turn…"}
          </p>
        )}
      </div>
    </main>
  );
}
