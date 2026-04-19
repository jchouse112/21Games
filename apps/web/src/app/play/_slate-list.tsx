import type { Slate } from "@/lib/slate";

export function SlateList({ slate }: { slate: Slate | null }) {
  if (slate === null) {
    return (
      <SlateShell label="Today's slate">
        <p className="mt-2 text-zinc-400">
          Couldn&apos;t load today&apos;s slate. Try again in a minute.
        </p>
      </SlateShell>
    );
  }

  if (slate.games.length === 0) {
    return (
      <SlateShell
        label="Today's slate"
        meta={slate.date}
      >
        <p className="mt-2 text-zinc-400">
          No MLB games on {slate.date}. Check back tomorrow.
        </p>
      </SlateShell>
    );
  }

  return (
    <SlateShell
      label="Today's slate"
      meta={`${slate.date} \u00b7 ${slate.games.length} game${slate.games.length === 1 ? "" : "s"}`}
    >
      <ul className="mt-6 divide-y divide-zinc-800">
        {slate.games.map((g) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="font-mono text-sm font-semibold tracking-wide text-zinc-100">
                {g.away.abbr}{" "}
                <span className="text-zinc-500">@</span> {g.home.abbr}
              </span>
              <span className="truncate text-sm text-zinc-500">
                {g.away.name} at {g.home.name}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-zinc-100">
                {g.timeLabel}
              </div>
              {g.venue ? (
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {g.venue}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </SlateShell>
  );
}

function SlateShell({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{label}</h2>
        {meta ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
