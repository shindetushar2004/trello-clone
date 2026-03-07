import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

    // Board fetch karo Firebase se
    const boardSnap = await getDoc(doc(db, "boards", boardId));
    if (!boardSnap.exists()) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Token generate karo
    const token = crypto.randomBytes(32).toString("hex");

    // Invite Firestore mein save karo
    await setDoc(doc(db, "board_invites", token), {
      board_id: boardId,
      invited_email: email.toLowerCase(),
      invited_by: userId,
      token,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });

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
        from: "TrelloClone <onboarding@resend.dev>",
        to: process.env.RESEND_DEV_TO_EMAIL || email.toLowerCase(),
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

    if (!emailRes.ok) {
      const emailError = await emailRes.json();
      console.error("Email send failed:", emailError);
      return NextResponse.json(
        { error: emailError.message || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Invite sent successfully" });
  } catch (err) {
    console.error("Invite error:", err);
    return NextResponse.json(
      { error: `Internal server error: ${err}` },
      { status: 500 }
    );
  }
}