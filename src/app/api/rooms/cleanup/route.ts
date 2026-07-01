import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("rooms")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) throw error;

    return NextResponse.json({ deleted: data?.length ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Could not clean rooms.";
}
