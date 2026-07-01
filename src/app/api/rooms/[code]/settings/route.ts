import { NextResponse } from "next/server";
import { nextRoomExpiry } from "@/lib/room-expiry";
import { redactRoom, type RoomSettings } from "@/lib/rooms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { hostToken, settings } = (await request.json()) as {
      hostToken?: string;
      settings?: RoomSettings;
    };

    if (!hostToken || !settings) {
      return NextResponse.json({ error: "Missing settings request." }, { status: 400 });
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
      return NextResponse.json({ error: "Only the host can change settings." }, { status: 403 });
    }

    if (room.status !== "lobby") {
      return NextResponse.json(
        { error: "Settings can only be changed before the round starts." },
        { status: 400 },
      );
    }

    const nextSettings: RoomSettings = {
      ...(room.settings ?? {}),
    };

    if ("showRoles" in settings) {
      nextSettings.showRoles = settings.showRoles !== false;
    }

    if ("mafiaCount" in settings) {
      nextSettings.mafiaCount = Math.max(1, Number(settings.mafiaCount) || 1);
    }

    if ("includeDoctor" in settings) {
      nextSettings.includeDoctor = settings.includeDoctor !== false;
    }

    if ("includeDetective" in settings) {
      nextSettings.includeDetective = settings.includeDetective !== false;
    }

    if ("revealRolesOnRemoval" in settings) {
      nextSettings.revealRolesOnRemoval = settings.revealRolesOnRemoval !== false;
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({ expires_at: nextRoomExpiry(), settings: nextSettings })
      .eq("id", room.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ room: redactRoom(updatedRoom) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update settings." },
      { status: 500 },
    );
  }
}
