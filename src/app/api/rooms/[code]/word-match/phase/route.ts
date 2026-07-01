import { NextResponse } from "next/server";
import { nextRoomExpiry } from "@/lib/room-expiry";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { hostToken, phase } = (await request.json()) as {
      hostToken?: string;
      phase?: "lobby" | "voting" | "reveal";
    };

    if (!hostToken || !phase) {
      return NextResponse.json({ error: "Missing phase request." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (room.host_token !== hostToken) {
      return NextResponse.json({ error: "Only the host can change phase." }, { status: 403 });
    }

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: "No active round." }, { status: 404 });
    }

    if (phase === "lobby") {
      if (room.status !== "result" || round.phase !== "result") {
        return NextResponse.json(
          { error: "A room can return to lobby only after the result." },
          { status: 400 },
        );
      }

      const { error: updateRoomError } = await supabase
        .from("rooms")
        .update({ expires_at: nextRoomExpiry(), status: "lobby" })
        .eq("id", room.id);

      if (updateRoomError) throw updateRoomError;

      return NextResponse.json({ ok: true });
    }

    if (phase === "voting" && (room.status !== "reveal" || round.phase !== "reveal")) {
      return NextResponse.json(
        { error: "Voting can only start after private cards are revealed." },
        { status: 400 },
      );
    }

    const { error: updateRoundError } = await supabase
      .from("rounds")
      .update({ phase })
      .eq("id", round.id);

    if (updateRoundError) throw updateRoundError;

    const { error: updateRoomError } = await supabase
      .from("rooms")
      .update({ expires_at: nextRoomExpiry(), status: phase })
      .eq("id", room.id);

    if (updateRoomError) throw updateRoomError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not change phase." },
      { status: 500 },
    );
  }
}
