import { NextResponse } from "next/server";

// Every API error has the same shape: { "error": "message" }
export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
