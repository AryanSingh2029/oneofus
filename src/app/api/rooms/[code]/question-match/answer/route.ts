import { NextResponse } from "next/server";
import { nextRoomExpiry } from "@/lib/room-expiry";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

type AnswerMetadata = {
  answerTargetPlayerId?: string;
  answerTargetPlayerName?: string;
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

    if (room.game_id !== "question-match") {
      return NextResponse.json(
        { error: "This room is not a Question Match room." },
        { status: 400 },
      );
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

    const progress = await getAnswerProgress(supabase, room.id);

    return NextResponse.json({
      ...progress,
      hasAnswered: progress.answeredPlayerIds.includes(player.id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load answers." },
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
      return NextResponse.json({ error: "Missing answer request." }, { status: 400 });
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

    if (room.game_id !== "question-match") {
      return NextResponse.json(
        { error: "This room is not a Question Match room." },
        { status: 400 },
      );
    }

    if (room.status !== "reveal") {
      return NextResponse.json(
        { error: "Answers are not open for this round." },
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

    const { data: target, error: targetError } = await supabase
      .from("room_players")
      .select("id,name")
      .eq("id", targetPlayerId)
      .eq("room_id", room.id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: "Answer target is invalid." }, { status: 400 });
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

    if (round.phase !== "reveal") {
      return NextResponse.json(
        { error: "Answers are not open for this round." },
        { status: 400 },
      );
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

    const metadata = {
      ...(assignment.metadata ?? {}),
      answerTargetPlayerId: target.id,
      answerTargetPlayerName: target.name,
    } satisfies AnswerMetadata;

    const { error: updateAssignmentError } = await supabase
      .from("round_assignments")
      .update({ metadata })
      .eq("id", assignment.id);

    if (updateAssignmentError) throw updateAssignmentError;

    const progress = await getAnswerProgress(supabase, room.id);

    if (progress.answers >= progress.needed) {
      const answerReveal = progress.answersList.map((answer) => ({
        playerId: answer.player_id,
        playerName: answer.player.name,
        targetPlayerId: answer.metadata.answerTargetPlayerId,
        targetPlayerName: answer.metadata.answerTargetPlayerName,
      }));

      const { error: updateRoundError } = await supabase
        .from("rounds")
        .update({
          phase: "discussion",
          content: {
            ...round.content,
            answerReveal,
          },
        })
        .eq("id", round.id);

      if (updateRoundError) throw updateRoundError;

      const { error: updateRoomError } = await supabase
        .from("rooms")
        .update({ expires_at: nextRoomExpiry(), status: "discussion" })
        .eq("id", room.id);

      if (updateRoomError) throw updateRoomError;
    } else {
      const { error: updateRoomError } = await supabase
        .from("rooms")
        .update({ expires_at: nextRoomExpiry() })
        .eq("id", room.id);

      if (updateRoomError) throw updateRoomError;
    }

    return NextResponse.json({
      ...progress,
      hasAnswered: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit answer." },
      { status: 500 },
    );
  }
}

async function getAnswerProgress(supabase: ReturnType<typeof getSupabaseAdminClient>, roomId: string) {
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (roundError || !round) throw new Error("No active round.");

  const { data: players, error: playersError } = await supabase
    .from("room_players")
    .select("id")
    .eq("room_id", roomId);

  if (playersError) throw playersError;

  const { data: answersList, error: answersError } = await supabase
    .from("round_assignments")
    .select("player_id, metadata, player:room_players(name)")
    .eq("round_id", round.id);

  if (answersError) throw answersError;

  const answeredAssignments = answersList.filter((assignment) => {
    const metadata = assignment.metadata as AnswerMetadata | null;
    return Boolean(metadata?.answerTargetPlayerId);
  });

  return {
    needed: players.length,
    answers: answeredAssignments.length,
    answeredPlayerIds: answeredAssignments.map((answer) => answer.player_id),
    answersList: answeredAssignments.map((answer) => ({
      player_id: answer.player_id as string,
      metadata: answer.metadata as AnswerMetadata,
      player: Array.isArray(answer.player) ? answer.player[0] : answer.player,
    })),
  };
}
