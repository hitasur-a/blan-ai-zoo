// booth後分析・運用調査用、Blob 中身をまとめて返す endpoint
// GET /api/analytics/peek?date=YYYY-MM-DD&demo=skill-growth&limit=20
// 注意: 内容に PII (氏名等) を含む可能性があるため、URL を晒さない運用必須

import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const demoFilter = url.searchParams.get("demo"); // 例: skill-growth
    const kindFilter = url.searchParams.get("kind"); // 例: generate
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

    const result = await list({ prefix: `analytics/${date}/`, limit: 500 });

    // フィルタ
    let filtered = result.blobs;
    if (demoFilter) {
      filtered = filtered.filter((b) => b.pathname.includes(`-${demoFilter}-`));
    }
    if (kindFilter) {
      filtered = filtered.filter((b) => b.pathname.endsWith(`-${kindFilter}.json`));
    }

    // 直近 limit 件
    filtered = filtered.slice(-limit).reverse();

    // 各 blob の中身を fetch (Private store なので Authorization 必須)
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const events = await Promise.all(
      filtered.map(async (b) => {
        try {
          const r = await fetch(b.url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!r.ok) return { pathname: b.pathname, error: `${r.status}` };
          const json = await r.json();
          return { pathname: b.pathname, uploadedAt: b.uploadedAt, ...json };
        } catch (err) {
          return { pathname: b.pathname, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    );

    return NextResponse.json({
      date,
      filter: { demo: demoFilter, kind: kindFilter },
      count: events.length,
      events,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
