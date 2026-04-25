import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Play 21 Games",
  description:
    "Terms and conditions for using Play 21 Games, a free-to-play sports skill game using play tokens only.",
};

const UPDATED_AT = "April 25, 2026";

const SECTIONS = [
  {
    title: "1. Free-to-play only",
    body: "Play 21 Games is a free-to-play skill game. Play Tokens have no cash value, cannot be purchased, cannot be sold, and cannot be withdrawn or redeemed for money.",
  },
  {
    title: "2. No gambling or wagering",
    body: "The game does not accept deposits, entry fees, real-money wagers, or paid token top-ups. Any references to bets, stakes, payouts, hits, or winnings describe in-game token mechanics only.",
  },
  {
    title: "3. Eligibility",
    body: "You must be at least 18 years old to use Play 21 Games. By using the service, you confirm that you meet this requirement and that your use is permitted where you live.",
  },
  {
    title: "4. Game rules and scoring",
    body: "Rules, odds, token balances, payout tables, hit mechanics, team availability, sport availability, and settlement behavior may change as the product evolves. We may correct errors, void affected entries, or adjust token balances when needed to preserve fair play.",
  },
  {
    title: "5. Tokens and levels",
    body: "Your token balance determines available stake sizes and level status. Tokens are for entertainment and gameplay progression only. We may reset, refill, modify, or remove token balances at our discretion during testing or beta periods.",
  },
  {
    title: "6. Sports data",
    body: "Play 21 Games uses third-party sports schedules, scores, and game data. We are not responsible for delays, inaccuracies, outages, stat corrections, postponed games, suspended games, or other data issues.",
  },
  {
    title: "7. Fair use",
    body: "Do not abuse, automate, reverse engineer, exploit bugs, interfere with the service, or use the game in a way that harms other users or the product. We may restrict access or reset data if misuse is detected.",
  },
  {
    title: "8. No guarantees",
    body: "The service is provided as-is and as-available. We do not guarantee uninterrupted availability, error-free gameplay, specific sports coverage, or preservation of test data.",
  },
  {
    title: "9. Changes to these terms",
    body: "We may update these Terms & Conditions from time to time. Continued use of Play 21 Games after updates means you accept the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-50">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400 transition hover:text-emerald-300"
        >
          Play 21 Games
        </Link>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            Last updated {UPDATED_AT}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-zinc-400">
            These terms explain the basic rules for using Play 21 Games. This page is written for clarity, but it is not legal advice.
          </p>

          <div className="mt-10 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-zinc-100">
                  {section.title}
                </h2>
                <p className="mt-2 leading-7 text-zinc-400">{section.body}</p>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-500">
          <p>No real-money wagering. No deposits. No withdrawals.</p>
          <Link href="/" className="text-zinc-300 transition hover:text-zinc-50">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}