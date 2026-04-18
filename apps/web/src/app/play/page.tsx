"use client";

import { getAvailableStakes, getTier } from "@/lib/dev-users";
import { useDevUser } from "@/lib/use-dev-user";

export default function PlayPage() {
  const { user, state, updateBalance, resetUser } = useDevUser();
  const tier = getTier(state.balance);
  const stakes = getAvailableStakes(state.balance);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
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
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
        <h2 className="text-xl font-semibold">Today&apos;s slate</h2>
        <p className="mt-2 text-zinc-400">
          Coming soon. Once the slate loader is in, today&apos;s eligible games
          will show up here.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
          Dev controls
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Simulate bankroll changes to test tier transitions. Persists in
          localStorage per dev user.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <DevButton onClick={() => updateBalance(state.balance - 5)}>
            -5
          </DevButton>
          <DevButton onClick={() => updateBalance(state.balance - 10)}>
            -10
          </DevButton>
          <DevButton onClick={() => updateBalance(state.balance + 20)}>
            +20
          </DevButton>
          <DevButton onClick={() => updateBalance(state.balance + 200)}>
            +200
          </DevButton>
          <DevButton onClick={() => updateBalance(state.balance + 2000)}>
            +2000
          </DevButton>
          <DevButton onClick={() => updateBalance(0)}>Zero out</DevButton>
          <DevButton onClick={resetUser}>Reset to 100</DevButton>
        </div>
      </section>
    </main>
  );
}

function DevButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
