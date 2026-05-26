// 来場者の入力履歴を Vercel Blob (Tokyo / Private) に 1 イベント = 1 JSON ファイルで保存
// パス例: analytics/2026-05-27/14-32-15-a1b2-senpai-wanko-chat.json
// booth 後に Vercel ダッシュボードから一括 download → Excel で分析する想定

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

interface AnalyticsBody {
  demoKey?: string;
  kind?: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  timestamp?: string;
  userAgent?: string;
  referrer?: string;
}

function sanitizeForPath(s: string): string {
  return (s || "unknown").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);
}

export async function POST(req: NextRequest) {
  try {
    const event: AnalyticsBody = await req.json();
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = now.toISOString().slice(11, 19).replace(/:/g, "-"); // HH-MM-SS
    const random = Math.random().toString(36).slice(2, 8);
    const demoKey = sanitizeForPath(event.demoKey || "unknown");
    const kind = sanitizeForPath(event.kind || "unknown");
    const pathname = `analytics/${date}/${time}-${random}-${demoKey}-${kind}.json`;

    await put(pathname, JSON.stringify(event, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[analytics] write failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
