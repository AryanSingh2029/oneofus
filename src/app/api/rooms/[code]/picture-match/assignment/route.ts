import { NextResponse } from "next/server";
import { nextRoomExpiry } from "@/lib/room-expiry";
import { redactRoom, redactRoomPlayer, redactRound } from "@/lib/rooms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const playerToken = url.searchParams.get("playerToken");

    if (!playerId || !playerToken) {
      return NextResponse.json({ error: "Missing player session." }, { status: 401 });
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

    if (room.game_id !== "picture-match") {
      return NextResponse.json(
        { error: "This room is not a Picture Match room." },
        { status: 400 },
      );
    }

    const { data: player, error: playerError } = await supabase
      .from("room_players")
      .select("*")
      .eq("id", playerId)
      .eq("room_id", room.id)
      .eq("player_token", playerToken)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "Player session is invalid." }, { status: 403 });
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

    const { data: assignment, error: assignmentError } = await supabase
      .from("round_assignments")
      .select("*")
      .eq("round_id", round.id)
      .eq("player_id", player.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: "No assignment found." }, { status: 404 });
    }

    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({ expires_at: nextRoomExpiry() })
      .eq("id", room.id);

    if (roomUpdateError) throw roomUpdateError;

    return NextResponse.json({
      room: redactRoom(room),
      round: redactRound(round),
      player: redactRoomPlayer(player),
      assignment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load assignment." },
      { status: 500 },
    );
  }
}
