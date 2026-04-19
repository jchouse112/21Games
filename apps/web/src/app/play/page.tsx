import { getTodaySlate, type Slate } from "@/lib/slate";
import { Dashboard } from "./_dashboard";
import { SlateList } from "./_slate-list";

export default async function PlayPage() {
  let slate: Slate | null = null;
  try {
    slate = await getTodaySlate();
  } catch (error) {
    console.error("Failed to load today's slate", error);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Dashboard />
      <SlateList slate={slate} />
    </main>
  );
}
