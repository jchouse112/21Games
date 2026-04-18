import { DevUserProvider } from "@/lib/use-dev-user";
import { PlayHeader } from "./_header";

export default function PlayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DevUserProvider>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
        <PlayHeader />
        <div className="flex-1">{children}</div>
      </div>
    </DevUserProvider>
  );
}
