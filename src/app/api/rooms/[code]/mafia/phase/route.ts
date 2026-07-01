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
      phase?: "night" | "voting" | "lobby";
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

    if (room.game_id !== "mafia") {
      return NextResponse.json({ error: "This room is not a Mafia room." }, { status: 400 });
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
      return NextResponse.json({ error: "No active game." }, { status: 404 });
    }

    if (phase === "lobby") {
      if (room.status !== "ended") {
        return NextResponse.json(
          { error: "A Mafia room can return to lobby only after the game ends." },
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

    if (phase === "night" && !["roleReveal", "trialResult"].includes(round.phase)) {
      return NextResponse.json(
        { error: "Night can start only after roles or a vote result." },
        { status: 400 },
      );
    }

    if (phase === "voting" && round.phase !== "day") {
      return NextResponse.json(
        { error: "Voting starts after the night result." },
        { status: 400 },
      );
    }

    if (phase === "night") {
      const { error: deleteVotesError } = await supabase
        .from("votes")
        .delete()
        .eq("round_id", round.id);

      if (deleteVotesError) throw deleteVotesError;
    }

    const nextPhase = phase === "voting" ? "voting" : "night";
    const { error: updateRoundError } = await supabase
      .from("rounds")
      .update({
        phase: nextPhase,
        content:
          phase === "night"
            ? {
                ...round.content,
                lastNightResult: null,
                lastVoteResult: null,
                nightChoices: [],
              }
            : round.content,
      })
      .eq("id", round.id);

    if (updateRoundError) throw updateRoundError;

    const { error: updateRoomError } = await supabase
      .from("rooms")
      .update({
        expires_at: nextRoomExpiry(),
        status: phase === "voting" ? "voting" : "reveal",
      })
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
