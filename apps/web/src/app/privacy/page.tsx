import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Play 21 Games",
  description:
    "Privacy policy for Play 21 Games, a free-to-play sports skill game using play tokens only.",
};

const UPDATED_AT = "April 25, 2026";

const SECTIONS = [
  {
    title: "1. Overview",
    body: "Play 21 Games is currently a lightweight free-to-play product. We aim to collect as little personal information as possible while the product is being tested and improved.",
  },
  {
    title: "2. Information stored on your device",
    body: "The app may store gameplay information in your browser's localStorage, including selected dev user, token balance, open bets, settled bets, level status, and refill state. This data stays in your browser unless you clear it or the app resets it.",
  },
  {
    title: "3. Information we may receive automatically",
    body: "If the app is hosted online, standard hosting and analytics systems may receive technical information such as IP address, browser type, device type, pages visited, timestamps, and error logs. This information helps operate, secure, and improve the service.",
  },
  {
    title: "4. Sports data",
    body: "The app uses third-party sports schedules, scores, and game information. Requests to those services may be made by our app or hosting infrastructure to display slates and results.",
  },
  {
    title: "5. No payment information",
    body: "Play 21 Games does not process deposits, withdrawals, purchases, paid token top-ups, or real-money wagers. We do not ask for or store payment card information for the core game.",
  },
  {
    title: "6. How information is used",
    body: "Information is used to run the game, remember your local gameplay state, display open and settled bets, troubleshoot issues, improve product design, prevent abuse, and keep the service reliable.",
  },
  {
    title: "7. Sharing",
    body: "We do not sell personal information. We may share limited technical information with service providers that help host, secure, monitor, or operate the app, or when required to comply with law or protect the product.",
  },
  {
    title: "8. Data controls",
    body: "Because gameplay state is currently stored locally, you can clear it by clearing site data in your browser. During testing, we may also reset token balances, bets, or other local gameplay data.",
  },
  {
    title: "9. Children's privacy",
    body: "Play 21 Games is intended for users who are at least 18 years old. It is not intended for children, and we do not knowingly collect information from children.",
  },
  {
    title: "10. Changes to this policy",
    body: "We may update this Privacy Policy as the product changes. Continued use of Play 21 Games after updates means you accept the revised policy.",
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-zinc-400">
            This policy explains what information Play 21 Games may store or receive and how that information is used.
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
          <p>Free to play. Tokens only. No payment information required.</p>
          <Link href="/" className="text-zinc-300 transition hover:text-zinc-50">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}