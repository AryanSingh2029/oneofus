import { NextResponse } from "next/server";
import pictureMatchPairs from "@/lib/content/picture-match-pairs.json";
import { nextRoomExpiry } from "@/lib/room-expiry";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

type PicturePair = {
  id: string;
  civilian: string;
  civilianImage: string;
  impostor: string;
  impostorImage: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { hostToken } = (await request.json()) as { hostToken?: string };

    if (!hostToken) {
      return NextResponse.json({ error: "Missing host token." }, { status: 401 });
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
      return NextResponse.json({ error: "Only the host can start." }, { status: 403 });
    }

    if (room.game_id !== "picture-match") {
      return NextResponse.json(
        { error: "This room is not a Picture Match room." },
        { status: 400 },
      );
    }

    if (room.status !== "lobby") {
      return NextResponse.json(
        { error: "Start a new round from the lobby." },
        { status: 400 },
      );
    }

    const { data: players, error: playersError } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });

    if (playersError) throw playersError;

    if (!players || players.length < 3) {
      return NextResponse.json(
        { error: "Picture Match needs at least 3 players." },
        { status: 400 },
      );
    }

    const pair = pictureMatchPairs[
      Math.floor(Math.random() * pictureMatchPairs.length)
    ] as PicturePair;
    const impostorIndex = Math.floor(Math.random() * players.length);
    const impostorPlayer = players[impostorIndex];

    const { data: lastRound } = await supabase
      .from("rounds")
      .select("round_number")
      .eq("room_id", room.id)
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const roundNumber = (lastRound?.round_number ?? 0) + 1;

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        room_id: room.id,
        round_number: roundNumber,
        phase: "reveal",
        content: {
          gameId: "picture-match",
          pairId: pair.id,
          civilian: pair.civilian,
          civilianImage: pair.civilianImage,
          impostor: pair.impostor,
          impostorImage: pair.impostorImage,
          impostorPlayerId: impostorPlayer.id,
          settings: {
            showRoles: room.settings?.showRoles !== false,
          },
        },
      })
      .select()
      .single();

    if (roundError) throw roundError;

    const assignments = players.map((player) => {
      const isImpostor = player.id === impostorPlayer.id;

      return {
        round_id: round.id,
        player_id: player.id,
        role: isImpostor ? "impostor" : "civilian",
        secret: isImpostor ? pair.impostor : pair.civilian,
        secret_image: isImpostor ? pair.impostorImage : pair.civilianImage,
        metadata: {},
      };
    });
    const { error: assignmentError } = await supabase
      .from("round_assignments")
      .insert(assignments);

    if (assignmentError) throw assignmentError;

    const { error: roomUpdateError } = await supabase
      .from("rooms")
      .update({ expires_at: nextRoomExpiry(), status: "reveal" })
      .eq("id", room.id);

    if (roomUpdateError) throw roomUpdateError;

    return NextResponse.json({ roundId: round.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start round." },
      { status: 500 },
    );
  }
}
