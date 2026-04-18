export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 text-zinc-50">
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">
          Play 21 Games
        </span>
        <h1 className="text-7xl font-semibold tracking-tight sm:text-8xl">
          Hit <span className="text-emerald-400">21</span>. Don&apos;t bust.
        </h1>
        <p className="max-w-md text-lg text-zinc-400">
          The blackjack of sports. Pick your teams, watch the runs, ride the line.
        </p>
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
          Coming soon
        </p>
      </div>
    </main>
  );
}
