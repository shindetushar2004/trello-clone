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

    // ✅ FIX: Service role se board fetch karo (RLS bypass)
    const { data: board, error: boardError } = await supabaseAdmin
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .single();

    if (boardError || !board) {
      console.error("Board error:", boardError);
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Unique invite token generate karo
    const token = crypto.randomBytes(32).toString("hex");

    // Invite database mein save karo
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
      return NextResponse.json({ error: `Failed to create invite: ${insertError.message}` }, { status: 500 });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
    const senderName = user?.firstName || user?.emailAddresses[0]?.emailAddress || "Someone";

    // ✅ FIX: onboarding@example.com use karo (Resend free account ka default sender)
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TrelloClone <onboarding@example.com>",
        to:email.toLowerCase(),    
        subject: `You've been invited to join "${boardTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563eb; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📋TrelloClone</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
              <p style="color: #4b5563; font-size: 16px;">
                <strong>${senderName}</strong> has invited you to join the
                <strong>"${boardTitle}"</strong> board on TrelloClone.
              </p>
              <p style="color: #4b5563;">Click the button below to accept the invite:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}"
                   style="background: #2563eb; color: white; padding: 14px 28px;
                          border-radius: 6px; text-decoration: none; font-size: 16px;
                          font-weight: bold; display: inline-block;">
                  Join Board →
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This invite will expire in 7 days.<br/>
                If you did not request this, please ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                If the button does not work, copy this link:<br/>
                <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.json();
      console.error("Email send failed:", emailError);
      return NextResponse.json({ error: `Failed to send email: ${JSON.stringify(emailError)}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Invite sent successfully!" });
  } catch (err) {
    console.error("Invite error:", err);
    return NextResponse.json({ error: `Internal server error: ${err}` }, { status: 500 });
  }
}