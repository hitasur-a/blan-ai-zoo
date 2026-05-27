// booth 当日に analytics の書き込みを確認するための簡易閲覧 endpoint
// 内容は出さず、ファイル名・サイズ・タイムスタンプ・件数のみ返す
// 公開されても致命的でない設計 (内容は Private store の token がないと読めない)

import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const prefix = `analytics/${date}/`;

    const result = await list({ prefix, limit: 1000 });
    const blobs = result.blobs.map((b) => ({
      pathname: b.pathname,
      size: b.size,
      uploadedAt: b.uploadedAt,
    }));

    // demoKey + kind ごとに集計 (pathname から推定: analytics/{date}/{time}-{rand}-{demo}-{kind}.json)
    const byDemo: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    for (const b of blobs) {
      const stem = b.pathname.split("/").pop()?.replace(/\.json$/, "") ?? "";
      const parts = stem.split("-");
      // 末尾の {kind}、その手前が {demo}
      const kind = parts[parts.length - 1] || "unknown";
      const demo = parts[parts.length - 2] || "unknown";
      byDemo[demo] = (byDemo[demo] || 0) + 1;
      byKind[kind] = (byKind[kind] || 0) + 1;
    }

    return NextResponse.json({
      date,
      prefix,
      count: blobs.length,
      byDemo,
      byKind,
      latest: blobs.slice(-15).reverse(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
