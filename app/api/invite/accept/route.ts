import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Login karo pehle" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token missing" }, { status: 400 });
    }

    // Token se invite dhundo
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("board_invites")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    // Expire check karo
    if (new Date(invite.expires_at) < new Date()) {
      await supabaseAdmin
        .from("board_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      return NextResponse.json({ error: "Invite expire ho gaya" }, { status: 410 });
    }

    // board_members mein add karo (agar pehle se nahi hai toh)
    const { error: memberError } = await supabaseAdmin
      .from("board_members")
      .upsert(
        { board_id: invite.board_id, user_id: userId, role: "member" },
        { onConflict: "board_id,user_id" }
      );

    if (memberError) {
      return NextResponse.json({ error: "Failed to join board" }, { status: 500 });
    }

    // Invite status accepted kar do
    await supabaseAdmin
      .from("board_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    return NextResponse.json({
      success: true,
      boardId: invite.board_id,
      message: "Board join ho gaya!",
    });
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}