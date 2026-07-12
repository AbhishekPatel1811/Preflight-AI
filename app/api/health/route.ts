import { NextResponse } from "next/server";

export function GET() {
  const response = NextResponse.json({
    ok: true,
    service: "preflight-ai",
    timestamp: new Date().toISOString()
  });

  response.headers.set("Cache-Control", "no-store");
  return response;
}
