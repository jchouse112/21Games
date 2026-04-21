import Link from "next/link";

const STEPS = [
  {
    num: "01",
    title: "Pick your teams",
    body: "Choose 3-6 teams from today's slate. No spreads. No props. Just teams.",
  },
  {
    num: "02",
    title: "Chase 21",
    body: "Their combined runs need to hit 21 \u2014 exact, or just under. Go over, you bust.",
  },
  {
    num: "03",
    title: "Win the slate",
    body: "Closer to 21 = bigger payout. Hit exactly 21 for the Blackjack bonus.",
  },
];

type SportIcon = "baseball" | "puck" | "basketball" | "football" | "soccer";

const SPORTS: Array<{
  name: string;
  metric: string;
  status: string;
  featured: boolean;
  icon: SportIcon;
}> = [
  { name: "Baseball 21", metric: "Runs", status: "Live", featured: true, icon: "baseball" },
  { name: "Ice 21", metric: "Goals", status: "Live", featured: true, icon: "puck" },
  { name: "Hoops 21", metric: "3-pointers", status: "Coming soon", featured: false, icon: "basketball" },
  { name: "Gridiron 21", metric: "Touchdowns", status: "Coming soon", featured: false, icon: "football" },
  { name: "Pitch 21", metric: "Goals", status: "Coming soon", featured: false, icon: "soccer" },
];

function SportGlyph({ icon, className }: { icon: SportIcon; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (icon) {
    case "baseball":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M5.6 6.5c3 2 4.4 5.4 3.8 9.4M18.4 6.5c-3 2-4.4 5.4-3.8 9.4" />
        </svg>
      );
    case "puck":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="9" rx="8.5" ry="2.8" />
          <path d="M3.5 9v5.5c0 1.55 3.8 2.8 8.5 2.8s8.5-1.25 8.5-2.8V9" />
          <path d="M3.5 12c0 1.55 3.8 2.8 8.5 2.8s8.5-1.25 8.5-2.8" />
        </svg>
      );
    case "basketball":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8" />
        </svg>
      );
    case "football":
      return (
        <svg {...common}>
          <path d="M4 12c0-4.5 3.5-8 8-8s8 3.5 8 8-3.5 8-8 8-8-3.5-8-8Z" />
          <path d="M9 12h6M10 10v4M12 10v4M14 10v4" />
        </svg>
      );
    case "soccer":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m12 7 3.5 2.5-1.3 4.1h-4.4L8.5 9.5 12 7Z" />
          <path d="M12 3v4M3.5 9.5l4.5 2M20.5 9.5l-4.5 2M7.5 20l2-4.6M16.5 20l-2-4.6" />
        </svg>
      );
  }
}

const FAQ = [
  { q: "Is this gambling?", a: "No. Play 21 Games is a free-to-play skill game. You play with Play Tokens, not dollars. No deposits, no withdrawals, no cash wagering." },
  { q: "What does it cost?", a: "Zero. You get 100 tokens on signup. Hit empty? We'll top you up with 10 tokens at midnight. No credit card, ever." },
  { q: "How do I win?", a: "Every slate, your picks are scored against the 21 target. Closest to 21 without busting wins the biggest payout. Hit exactly 21 for the Blackjack bonus." },
  { q: "What's the Basement? The Penthouse?", a: "Your balance unlocks bet sizes. Under 10 tokens you're in the Basement \u2014 $1 bets only. Climb past 2,000 and you're in the Penthouse." },
  { q: "What sports can I play?", a: "Baseball 21 and Ice 21 are live. Hoops, Gridiron, and Pitch are rolling out through the season." },
  { q: "Will there ever be real money?", a: "Not in the core game. Ever. We may run occasional skill-based tournaments with real prizes, but the daily slate stays free and token-only." },
];

export default function Home() {
  return (
    <div className="bg-zinc-950 text-zinc-50">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">
          Play 21 Games
        </span>
        <h1 className="mt-6 text-6xl font-semibold tracking-tight sm:text-8xl">
          Hit <span className="text-emerald-400">21</span>. Don&apos;t bust.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-400 sm:text-xl">
          The blackjack of sports. Pick teams. Stack runs. Win the slate.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/play"
            className="rounded-full bg-emerald-400 px-8 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            Play Free
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-full border border-zinc-700 px-8 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
          >
            How it works
          </Link>
        </div>
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
          100 free tokens &middot; No credit card &middot; 18+
        </p>
      </section>

      <section id="how-it-works" className="border-t border-zinc-800 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">How it works</h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.num} className="flex flex-col gap-3">
                <span className="font-mono text-sm text-emerald-400">{step.num}</span>
                <h3 className="text-2xl font-semibold">{step.title}</h3>
                <p className="text-zinc-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">The lineup</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-zinc-400">Five sports. One target. 21.</p>
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SPORTS.map((sport) => (
              <div
                key={sport.name}
                className={
                  "flex flex-col gap-3 rounded-xl border p-6 " +
                  (sport.featured
                    ? "border-emerald-400/40 bg-emerald-400/5"
                    : "border-zinc-800 bg-zinc-900/40")
                }
              >
                <div className="flex items-center justify-between">
                  <SportGlyph
                    icon={sport.icon}
                    className={
                      "h-8 w-8 " +
                      (sport.featured ? "text-emerald-400" : "text-zinc-500")
                    }
                  />
                  <span
                    className={
                      "font-mono text-xs uppercase tracking-[0.2em] " +
                      (sport.featured ? "text-emerald-400" : "text-zinc-500")
                    }
                  >
                    {sport.status}
                  </span>
                </div>
                <h3 className="text-xl font-semibold">{sport.name}</h3>
                <p className="text-sm text-zinc-400">{sport.metric}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">Frequently asked</h2>
          <div className="mt-16 divide-y divide-zinc-800 border-y border-zinc-800">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-6">
                <summary className="flex cursor-pointer items-center justify-between text-lg font-medium">
                  {item.q}
                  <span className="ml-4 text-zinc-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-zinc-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-400">Play 21 Games</span>
            <p className="mt-2 text-xs text-zinc-500">
              &copy; 2026 Play 21 Games. A free-to-play skill game. No real-money wagering. No deposits. No withdrawals. Must be 18+.
            </p>
          </div>
          <div className="flex gap-6 text-xs text-zinc-400">
            <Link href="/about" className="hover:text-zinc-200">About</Link>
            <Link href="/faq" className="hover:text-zinc-200">FAQ</Link>
            <Link href="/terms" className="hover:text-zinc-200">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-200">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
