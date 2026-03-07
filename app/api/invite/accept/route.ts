import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Login karo pehle" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token missing" }, { status: 400 });
    }

    // Token se invite dhundo
    const inviteSnap = await getDoc(doc(db, "board_invites", token));
    if (!inviteSnap.exists()) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    const invite = inviteSnap.data();

    // Status check
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite already used or expired" }, { status: 410 });
    }

    // Expire check
    if (new Date(invite.expires_at) < new Date()) {
      await updateDoc(doc(db, "board_invites", token), { status: "expired" });
      return NextResponse.json({ error: "Invite expire ho gaya" }, { status: 410 });
    }

    // board_members mein add karo
    const memberKey = `${invite.board_id}_${userId}`;
    await setDoc(doc(db, "board_members", memberKey), {
      board_id: invite.board_id,
      user_id: userId,
      role: "member",
      joined_at: new Date().toISOString(),
    });

    // Invite status update karo
    await updateDoc(doc(db, "board_invites", token), { status: "accepted" });

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