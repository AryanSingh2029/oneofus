import { NextResponse } from "next/server";
import { nextRoomExpiry } from "@/lib/room-expiry";
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

    const { data: player, error: playerError } = await supabase
      .from("room_players")
      .select("id")
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

    const { data: players, error: playersError } = await supabase
      .from("room_players")
      .select("id")
      .eq("room_id", room.id);

    if (playersError) throw playersError;

    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("voter_player_id")
      .eq("round_id", round.id);

    if (votesError) throw votesError;

    return NextResponse.json({
      hasVoted: votes.some((vote) => vote.voter_player_id === player.id),
      needed: players.length,
      votes: votes.length,
      votedPlayerIds: votes.map((vote) => vote.voter_player_id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load vote status." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { playerId, playerToken, targetPlayerId } = (await request.json()) as {
      playerId?: string;
      playerToken?: string;
      targetPlayerId?: string;
    };

    if (!playerId || !playerToken || !targetPlayerId) {
      return NextResponse.json({ error: "Missing vote request." }, { status: 400 });
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

    const { data: voter, error: voterError } = await supabase
      .from("room_players")
      .select("*")
      .eq("id", playerId)
      .eq("room_id", room.id)
      .eq("player_token", playerToken)
      .single();

    if (voterError || !voter) {
      return NextResponse.json({ error: "Player session is invalid." }, { status: 403 });
    }

    const { data: target, error: targetError } = await supabase
      .from("room_players")
      .select("*")
      .eq("id", targetPlayerId)
      .eq("room_id", room.id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: "Vote target is invalid." }, { status: 400 });
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

    if (room.status !== "voting" || round.phase !== "voting") {
      return NextResponse.json(
        { error: "Voting is not open for this round." },
        { status: 400 },
      );
    }

    const { error: voteError } = await supabase.from("votes").upsert(
      {
        round_id: round.id,
        voter_player_id: voter.id,
        target_player_id: target.id,
      },
      { onConflict: "round_id,voter_player_id" },
    );

    if (voteError) throw voteError;

    const { data: players, error: playersError } = await supabase
      .from("room_players")
      .select("id")
      .eq("room_id", room.id);

    if (playersError) throw playersError;

    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("*")
      .eq("round_id", round.id);

    if (votesError) throw votesError;

    if (votes.length >= players.length) {
      const selectedTargetId = chooseMostCommonTarget(
        votes.map((vote) => vote.target_player_id as string),
      );
      const { data: selectedAssignment, error: selectedAssignmentError } =
        await supabase
          .from("round_assignments")
          .select("*")
          .eq("round_id", round.id)
          .eq("player_id", selectedTargetId)
          .single();

      if (selectedAssignmentError) throw selectedAssignmentError;

      const { data: selectedPlayer, error: selectedPlayerError } = await supabase
        .from("room_players")
        .select("*")
        .eq("id", selectedTargetId)
        .single();

      if (selectedPlayerError) throw selectedPlayerError;

      const { data: impostorAssignment, error: impostorAssignmentError } =
        await supabase
          .from("round_assignments")
          .select("player_id")
          .eq("round_id", round.id)
          .eq("role", "impostor")
          .single();

      if (impostorAssignmentError) throw impostorAssignmentError;

      const { data: impostorPlayer, error: impostorPlayerError } = await supabase
        .from("room_players")
        .select("id,name")
        .eq("id", impostorAssignment.player_id)
        .single();

      if (impostorPlayerError) throw impostorPlayerError;

      const nextContent = {
        ...round.content,
        result: {
          selectedPlayerId: selectedTargetId,
          selectedPlayerName: selectedPlayer.name,
          selectedRole: selectedAssignment.role,
          caughtImpostor: selectedAssignment.role === "impostor",
          impostorPlayerId: impostorPlayer.id,
          impostorPlayerName: impostorPlayer.name,
        },
      };

      const { error: roundUpdateError } = await supabase
        .from("rounds")
        .update({ phase: "result", content: nextContent })
        .eq("id", round.id);

      if (roundUpdateError) throw roundUpdateError;

      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({ expires_at: nextRoomExpiry(), status: "result" })
        .eq("id", room.id);

      if (roomUpdateError) throw roomUpdateError;
    } else {
      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({ expires_at: nextRoomExpiry() })
        .eq("id", room.id);

      if (roomUpdateError) throw roomUpdateError;
    }

    return NextResponse.json({
      hasVoted: true,
      votes: votes.length,
      needed: players.length,
      votedPlayerIds: votes.map((vote) => vote.voter_player_id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit vote." },
      { status: 500 },
    );
  }
}

function chooseMostCommonTarget(targetIds: string[]) {
  const counts = targetIds.reduce<Record<string, number>>((currentCounts, id) => {
    currentCounts[id] = (currentCounts[id] ?? 0) + 1;
    return currentCounts;
  }, {});
  const highestCount = Math.max(...Object.values(counts));
  const tiedTargets = Object.entries(counts)
    .filter(([, count]) => count === highestCount)
    .map(([id]) => id);

  return tiedTargets[Math.floor(Math.random() * tiedTargets.length)];
}
