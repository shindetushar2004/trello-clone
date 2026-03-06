import { createClient } from "@supabase/supabase-js";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const { boardId, email, boardTitle } = await req.json();

    if (!boardId || !email || !boardTitle) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Board fetch (RLS bypass using service role)
    const { data: board, error: boardError } = await supabaseAdmin
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .single();

    if (boardError || !board) {
      console.error("Board error:", boardError);
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Token generate
    const token = crypto.randomBytes(32).toString("hex");

    // Invite save in DB
    const { error: insertError } = await supabaseAdmin
      .from("board_invites")
      .insert({
        board_id: boardId,
        invited_email: email.toLowerCase(),
        invited_by: userId,
        token,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: `Failed to create invite: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    const senderName =
      user?.firstName ||
      user?.emailAddresses[0]?.emailAddress ||
      "Someone";

    // Email send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TrelloClone <onboarding@example.com>",
        to: email.toLowerCase(),
        subject: `You've been invited to join "${boardTitle}"`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width:600px;margin:auto">
          <h2>📋 TrelloClone Invitation</h2>
          <p><b>${senderName}</b> invited you to join board:</p>
          <h3>${boardTitle}</h3>

          <p>Click below to join:</p>

          <a href="${inviteUrl}"
             style="background:#2563eb;color:white;padding:12px 20px;
             text-decoration:none;border-radius:6px">
             Join Board
          </a>

          <p style="margin-top:20px;font-size:12px;color:#777">
            If button doesn't work, copy this link:
          </p>

          <p>${inviteUrl}</p>
        </div>
        `,
      }),
    });

    // Email error handling
    if (!emailRes.ok) {
      const emailError = await emailRes.json();
      console.error("Email send failed:", emailError);

      return NextResponse.json(
        { error: emailError.message },
        { status: 500 }
      );
    }

    const result = await emailRes.json();
    console.log("Email sent:", result);

    return NextResponse.json({
      success: true,
      message: "Invite sent successfully",
    });
  } catch (err) {
    console.error("Invite error:", err);

    return NextResponse.json(
      { error: `Internal server error: ${err}` },
      { status: 500 }
    );
  }
}