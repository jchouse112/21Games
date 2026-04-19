import { Dashboard } from "../_dashboard";
import { ActiveBets } from "../_active-bets";
import { ClosedBets } from "../_closed-bets";

export default function MyBetsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Dashboard />
      <ActiveBets />
      <ClosedBets />
    </main>
  );
}
