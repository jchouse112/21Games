"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEV_USERS, getTier } from "@/lib/dev-users";
import { useDevUser } from "@/lib/use-dev-user";

const TABS = [
  { href: "/play", label: "Bet" },
  { href: "/play/my-bets", label: "My Bets" },
] as const;

export function PlayHeader() {
  const { user, state, setUserId } = useDevUser();
  const tier = getTier(state.balance);
  const pathname = usePathname() ?? "/play";

  return (
    <header className="border-b border-zinc-800 px-6 py-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400"
          >
            Play 21 Games
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {TABS.map((tab) => {
              const active =
                tab.href === "/play"
                  ? pathname === "/play"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden flex-col items-end sm:flex">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {tier}
            </span>
            <span className="text-lg font-semibold leading-tight">
              {state.balance}{" "}
              <span className="text-sm font-normal text-zinc-400">tokens</span>
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 sm:inline">
              Dev user
            </span>
            <select
              value={user.id}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              {DEV_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.handle}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}
