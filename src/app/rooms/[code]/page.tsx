import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RoomLobby } from "@/components/room-lobby";

type RoomPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <nav className="mx-auto flex h-14 max-w-content items-center justify-between px-5 text-sm text-ink-muted md:px-8">
        <Link className="flex items-center gap-2 hover:text-ink" href="/#games">
          <ArrowLeft size={16} />
          Games
        </Link>
        <Link className="font-medium text-ink" href="/">
          One of Us
        </Link>
      </nav>

      <section className="mx-auto max-w-content px-5 py-14 md:px-8 md:py-24">
        <RoomLobby code={code} />
      </section>
    </main>
  );
}
