import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "./_how-it-works";

type SportIcon = "baseball" | "puck" | "basketball" | "football" | "soccer";

const SPORTS: Array<{
  name: string;
  metric: string;
  status: string;
  featured: boolean;
  icon: SportIcon;
  href?: string;
}> = [
  { name: "Baseball 21", metric: "Runs", status: "Live", featured: true, icon: "baseball", href: "/play/mlb" },
  { name: "Ice 21", metric: "Goals", status: "Live", featured: true, icon: "puck", href: "/play/nhl" },
  { name: "Hoops 21", metric: "3-pointers", status: "Coming soon", featured: false, icon: "basketball" },
  { name: "Gridiron 21", metric: "Touchdowns", status: "Coming soon", featured: false, icon: "football" },
  { name: "Pitch 9", metric: "Goals", status: "Coming soon", featured: false, icon: "soccer" },
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
  { q: "How do I win?", a: "Every slate, your picks are scored against that game's target. Closest without busting wins the biggest payout. Hit the target exactly for the Blackjack bonus." },
  { q: "Can I change my bet after placing it?", a: "You can Hit to add a team or player to an open bet — costs 25% of your original stake. Baseball maxes out at 6 picks; hockey maxes out at 8. The pick has to still be early: before the 4th inning in baseball, before the 2nd period in hockey. No cash-out, no lock-in." },
  { q: "How do levels work?", a: "Your token balance unlocks bigger bet sizes: Rookie starts with $1 bets, Starter adds $2, All-Star unlocks $5 and $10, and MVP unlocks $25." },
  { q: "What sports can I play?", a: "Baseball 21 and Ice 21 are live. Hoops, Gridiron, and Pitch are rolling out through the season." },
  { q: "Will there ever be real money?", a: "Not in the core game. Ever. We may run occasional skill-based tournaments with real prizes, but the daily slate stays free and token-only." },
];

export default function Home() {
  return (
    <div className="bg-zinc-950 text-zinc-50">
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div aria-hidden="true" className="absolute inset-0 md:hidden">
          <Image
            src="/hero-crowd.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-b from-zinc-950/70 via-zinc-950/40 to-zinc-950" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 hidden md:block">
          <Image
            src="/hero-crowd-wide.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-b from-zinc-950/75 via-zinc-950/45 to-zinc-950" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">
            Play 21 Games
          </span>
          <h1 className="mt-6 text-6xl font-semibold tracking-tight sm:text-8xl">
            Hit <span className="text-emerald-400">21</span>. Don&apos;t bust.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-300 sm:text-xl">
            The blackjack of sports. Pick teams or players. Chase the target. Win the slate.
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
              className="rounded-full border border-zinc-700 bg-zinc-950/60 px-8 py-3 text-sm font-semibold text-zinc-200 backdrop-blur transition hover:border-zinc-500"
            >
              How it works
            </Link>
          </div>
          <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[13px] uppercase tracking-[0.15em] text-zinc-400 sm:text-xs sm:tracking-[0.3em]">
            <span>100 free tokens</span>
            <span aria-hidden="true" className="text-zinc-600">&middot;</span>
            <span>No credit card</span>
            <span aria-hidden="true" className="text-zinc-600">&middot;</span>
            <span>18+</span>
          </p>
        </div>
      </section>

      <HowItWorks />

      <section className="border-t border-zinc-800 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">The lineup</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-zinc-400">Five sports. Blackjack-style targets.</p>
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SPORTS.map((sport) => {
              const baseClasses =
                "flex flex-col gap-3 rounded-xl border p-6 " +
                (sport.featured
                  ? "border-emerald-400/40 bg-emerald-400/5"
                  : "border-zinc-800 bg-zinc-900/40");
              const interactiveClasses = sport.href
                ? " transition hover:border-emerald-400 hover:bg-emerald-400/10"
                : "";
              const content = (
                <>
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
                </>
              );
              return sport.href ? (
                <Link
                  key={sport.name}
                  href={sport.href}
                  className={baseClasses + interactiveClasses}
                >
                  {content}
                </Link>
              ) : (
                <div key={sport.name} className={baseClasses}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-zinc-800 px-6 py-24">
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
            <Link href="/#faq" className="hover:text-zinc-200">FAQ</Link>
            <Link href="/terms" className="hover:text-zinc-200">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="hover:text-zinc-200">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
