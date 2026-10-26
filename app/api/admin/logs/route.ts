/**
 * app/api/admin/logs/route.ts
 *
 * Protected API endpoint to retrieve usage logs for the /admin dashboard.
 * Requires ADMIN_SECRET validation via the x-admin-key request header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUsageLogs } from "@/lib/usage-logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  const providedKey = req.headers.get("x-admin-key")?.trim();

  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET environment variable is not set in server configuration." },
      { status: 500 }
    );
  }

  if (!providedKey || providedKey !== adminSecret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing admin key." },
      { status: 401 }
    );
  }

  try {
    const rawLogs = await getUsageLogs();
    // Sort most recent first
    const logs = [...rawLogs].reverse();
    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const msg = (err as Error)?.message || "Failed to fetch usage logs from Google Sheets.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
