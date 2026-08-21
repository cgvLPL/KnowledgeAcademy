import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "1",
      name: "Participant One",
      position: "Star",
      currentQuestion: 12,
      totalQuestions: 30,
      status: "active",
      lastActivityAt: new Date().toISOString(),
    },
  ]);
}
