"use client";

import { TIER_LEVELS, getAvailableStakes, getTier, getTierProgress } from "@/lib/dev-users";
import { useDevUser } from "@/lib/use-dev-user";

export function Dashboard() {
  const { user, state } = useDevUser();
  const tier = getTier(state.balance);
  const stakes = getAvailableStakes(state.balance);
  const progress = getTierProgress(state.balance);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">
            {tier}
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            {user.handle}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Balance
          </p>
          <p className="text-5xl font-semibold leading-none">
            {state.balance}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            tokens
          </p>
        </div>
      </div>
      <div className="mt-8 border-t border-zinc-800 pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Level progress
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {progress.next ? (
                    <>
                      {progress.remaining} token{progress.remaining === 1 ? "" : "s"} to {progress.next.tier}
                    </>
                  ) : (
                    <>Top level unlocked</>
                  )}
                </p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {progress.next ? `${state.balance} / ${progress.next.minBalance}` : `${state.balance}+`}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="mt-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Available stakes
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {stakes.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm"
                  >
                    ${s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Levels unlock stakes
            </p>
            <div className="mt-3 space-y-2">
              {TIER_LEVELS.map((level) => {
                const active = level.tier === tier;
                return (
                  <div
                    key={level.tier}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                      active
                        ? "border-emerald-400/40 bg-emerald-400/10"
                        : "border-zinc-800 bg-zinc-900/50"
                    }`}
                  >
                    <div>
                      <p className={active ? "text-sm font-semibold text-emerald-200" : "text-sm font-semibold text-zinc-300"}>
                        {level.tier}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                        {level.minBalance}+ tokens
                      </p>
                    </div>
                    <p className="text-right font-mono text-[10px] text-zinc-400">
                      {level.stakes.map((s) => `$${s}`).join(" ")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
